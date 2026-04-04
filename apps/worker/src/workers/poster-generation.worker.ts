import type { Job } from "bullmq";
import { z } from "zod";
import { supabase, logWorkflow } from "../services/supabase.service";
import { downloadAndUpload } from "../services/storage.service";
import {
  buildHeroImagePrompt,
  generateHeroImage,
  segmentHeroImage,
  analyseComposition,
  buildPosterLayout,
  generateCanvasBackground,
  type PosterFormat,
  type PosterLayout,
  type CompositionAnalysis,
  type BrandGuidelines,
} from "../pipeline/poster-pipeline";
import { logger } from "../logger";

interface PosterGenerationJobData {
  posterId: string;
  userId: string;
  brandId: string;
  prompt: string;
  format: PosterFormat;
  referenceImageUrl?: string;
}

const PosterJobSchema = z.object({
  posterId: z.string().uuid(),
  userId: z.string().uuid(),
  brandId: z.string().uuid(),
  prompt: z.string().min(1).max(500),
  format: z.enum(["square", "portrait_a4", "landscape_16_9", "story_9_16"]),
  referenceImageUrl: z.string().url().optional(),
});

const POSTER_DIMENSIONS: Record<PosterFormat, { width: number; height: number }> = {
  square:         { width: 1080, height: 1080 },
  portrait_a4:    { width: 794,  height: 1123 },
  landscape_16_9: { width: 1920, height: 1080 },
  story_9_16:     { width: 1080, height: 1920 },
};

async function setStage(posterId: string, stage: string): Promise<void> {
  await supabase
    .from("poster_jobs")
    .update({ current_stage: stage })
    .eq("poster_id", posterId);
}

export async function processPosterGeneration(
  job: Job<PosterGenerationJobData>
): Promise<void> {
  const parsed = PosterJobSchema.safeParse(job.data);
  if (!parsed.success) {
    throw new Error(`Invalid job payload: ${parsed.error.errors[0].message}`);
  }
  const { posterId, userId, brandId, prompt, format, referenceImageUrl } = parsed.data;
  const logStart = Date.now();
  const isRetry = job.attemptsMade > 0;

  logger.info("Poster generation started", {
    jobId: job.id,
    posterId,
    brandId,
    format,
    hasReference: !!referenceImageUrl,
    attempt: job.attemptsMade,
  });

  await logWorkflow({
    workflowName: "poster_generation",
    entityId: posterId,
    entityType: "posters",
    userId,
    status: "started",
    metadata: { jobId: job.id, format, hasReference: !!referenceImageUrl, attempt: job.attemptsMade },
  });

  try {
    await supabase
      .from("posters")
      .update({ status: "generating" })
      .eq("id", posterId);

    await supabase
      .from("poster_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("poster_id", posterId);

    // Fetch brand — system_prompt for image generation, brand_guidelines for fonts + colors
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("system_prompt, brand_guidelines")
      .eq("id", brandId)
      .single();

    if (brandError || !brand) {
      throw new Error(`Brand not found: ${brandError?.message ?? "unknown"}`);
    }

    const brandSystemPrompt = brand.system_prompt ?? "";
    const brandGuidelines = (brand.brand_guidelines ?? null) as BrandGuidelines | null;
    const dimensions = POSTER_DIMENSIONS[format];

    // ── Read checkpoint state ────────────────────────────────
    // On retries, stages that already wrote their output to the DB are skipped.
    const { data: checkpoint } = await supabase
      .from("posters")
      .select("hero_image_url, composition_json, layout_json, background_url")
      .eq("id", posterId)
      .single();

    const { data: existingLayers } = await supabase
      .from("poster_layers")
      .select("layer_index, layer_url")
      .eq("poster_id", posterId)
      .order("layer_index");

    // ── STAGE 1: Generate hero image ─────────────────────────
    let heroImageUrl: string;

    if (checkpoint?.hero_image_url) {
      heroImageUrl = checkpoint.hero_image_url;
      if (isRetry) logger.info("Stage 1: skipping (already done)", { posterId });
    } else {
      await setStage(posterId, "generating");
      logger.info("Stage 1: Generating hero image", { posterId });

      const imagePrompt = await buildHeroImagePrompt(
        prompt,
        brandSystemPrompt,
        brandGuidelines,
        referenceImageUrl
      );
      const replicateUrl = await generateHeroImage(
        imagePrompt,
        dimensions,
        referenceImageUrl
      );

      // Download from Replicate CDN and store permanently so retries can reuse it
      const heroPath = `${userId}/${posterId}/hero.png`;
      heroImageUrl = await downloadAndUpload(
        replicateUrl,
        "poster-layers", // public bucket — hero is AI-generated, not user data
        heroPath,
        "image/png",
        true
      );

      await supabase
        .from("posters")
        .update({ hero_image_url: heroImageUrl })
        .eq("id", posterId);
    }

    // ── STAGE 2: Qwen segmentation ───────────────────────────
    let layerUrls: string[];

    if (existingLayers && existingLayers.length > 0) {
      layerUrls = existingLayers.map((l) => l.layer_url);
      if (isRetry) logger.info("Stage 2: skipping (already done)", { posterId, layers: layerUrls.length });
    } else {
      await setStage(posterId, "segmenting");
      logger.info("Stage 2: Segmenting hero image", { posterId });
      layerUrls = await segmentHeroImage(heroImageUrl, userId, posterId);
    }

    // ── STAGE 3: Composition analysis ───────────────────────
    let composition: CompositionAnalysis;

    if (checkpoint?.composition_json) {
      composition = checkpoint.composition_json as CompositionAnalysis;
      if (isRetry) logger.info("Stage 3: skipping (already done)", { posterId });
    } else {
      await setStage(posterId, "analysing");
      logger.info("Stage 3: Analysing composition", { posterId });
      composition = await analyseComposition(heroImageUrl);

      await supabase
        .from("posters")
        .update({ composition_json: composition })
        .eq("id", posterId);
    }

    // ── STAGE 4: Layout & text design ───────────────────────
    let layout: PosterLayout;

    if (checkpoint?.layout_json) {
      layout = checkpoint.layout_json as PosterLayout;
      if (isRetry) logger.info("Stage 4: skipping (already done)", { posterId });
    } else {
      await setStage(posterId, "designing");
      logger.info("Stage 4: Designing poster layout", { posterId });
      layout = await buildPosterLayout(
        prompt,
        composition,
        brandSystemPrompt,
        brandGuidelines,
        { ...dimensions, format },
        layerUrls.length
      );

      await supabase
        .from("posters")
        .update({ layout_json: layout })
        .eq("id", posterId);
    }

    // ── STAGE 5: Canvas background (conditional) ────────────
    let backgroundUrl: string | null = null;
    const needsAiBackground = layout.background?.type === "ai_image";

    if (!needsAiBackground) {
      // solid_color: nothing to generate
    } else if (checkpoint?.background_url) {
      backgroundUrl = checkpoint.background_url;
      if (isRetry) logger.info("Stage 5: skipping (already done)", { posterId });
    } else {
      await setStage(posterId, "background");
      logger.info("Stage 5: Generating canvas background", { posterId });
      backgroundUrl = await generateCanvasBackground(
        layout.background!.background_prompt!,
        dimensions,
        userId,
        posterId
      );

      await supabase
        .from("posters")
        .update({ background_url: backgroundUrl })
        .eq("id", posterId);
    }

    // ── STAGE 6: Finalise ────────────────────────────────────
    await setStage(posterId, "finishing");
    logger.info("Stage 6: Finishing up", { posterId });

    await supabase
      .from("posters")
      .update({ status: "completed" })
      .eq("id", posterId);

    await supabase
      .from("poster_jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("poster_id", posterId);

    await logWorkflow({
      workflowName: "poster_generation",
      entityId: posterId,
      entityType: "posters",
      userId,
      status: "completed",
      duration_ms: Date.now() - logStart,
      metadata: {
        format,
        textLayers: layout.text_layers?.length,
        imageLayers: layerUrls.length,
        backgroundType: layout.background?.type,
        attempt: job.attemptsMade,
      },
    });

    logger.info("Poster generation completed", {
      jobId: job.id,
      posterId,
      duration_ms: Date.now() - logStart,
      layers: layerUrls.length,
    });
  } catch (error) {
    const err = error as Error;
    logger.error("Poster generation failed", {
      jobId: job.id,
      posterId,
      error: err.message,
      stack: err.stack,
      attempt: job.attemptsMade,
    });

    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3) - 1;

    if (isLastAttempt) {
      await supabase
        .from("posters")
        .update({ status: "failed", error_message: err.message })
        .eq("id", posterId);

      await supabase
        .from("poster_jobs")
        .update({
          status: "failed",
          error_details: { message: err.message, stack: err.stack },
          completed_at: new Date().toISOString(),
        })
        .eq("poster_id", posterId);

      await logWorkflow({
        workflowName: "poster_generation",
        entityId: posterId,
        entityType: "posters",
        userId,
        status: "failed",
        duration_ms: Date.now() - logStart,
        error: { message: err.message },
      });
    } else {
      await supabase
        .from("poster_jobs")
        .update({
          status: "retrying",
          attempt_count: job.attemptsMade + 1,
          error_details: { message: err.message },
        })
        .eq("poster_id", posterId);
    }

    throw error;
  }
}
