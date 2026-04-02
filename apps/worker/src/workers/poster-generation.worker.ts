import type { Job } from "bullmq";
import { supabase, logWorkflow } from "../services/supabase.service";
import {
  extractPosterIntent,
  buildPosterLayout,
  generatePosterBackground,
  storePosterBackground,
  type PosterFormat,
} from "../pipeline/poster-pipeline";
import { logger } from "../logger";

interface PosterGenerationJobData {
  posterId: string;
  userId: string;
  brandId: string;
  prompt: string;
  format: PosterFormat;
}

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
  const { posterId, userId, brandId, prompt, format } = job.data;
  const logStart = Date.now();

  logger.info("Poster generation started", {
    jobId: job.id,
    posterId,
    brandId,
    format,
  });

  await logWorkflow({
    workflowName: "poster_generation",
    entityId: posterId,
    entityType: "posters",
    userId,
    status: "started",
    metadata: { jobId: job.id, format },
  });

  try {
    // Mark as generating
    await supabase
      .from("posters")
      .update({ status: "generating" })
      .eq("id", posterId);

    await supabase
      .from("poster_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("poster_id", posterId);

    // Fetch brand system prompt
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("system_prompt")
      .eq("id", brandId)
      .single();

    if (brandError || !brand) {
      throw new Error(`Brand not found: ${brandError?.message ?? "unknown"}`);
    }

    const brandSystemPrompt = brand.system_prompt ?? "";
    const dimensions = POSTER_DIMENSIONS[format];

    // STAGE 1: Extract intent
    await setStage(posterId, "intent");
    logger.info("Stage 1: Extracting poster intent", { posterId });
    const intent = await extractPosterIntent(prompt);

    // STAGE 2: Build layout
    await setStage(posterId, "layout");
    logger.info("Stage 2: Building poster layout", { posterId });
    const layout = await buildPosterLayout(intent, brandSystemPrompt, {
      ...dimensions,
      format,
    });

    // STAGE 3: Generate background image
    await setStage(posterId, "background");
    logger.info("Stage 3: Generating poster background", { posterId });
    const replicateCdnUrl = await generatePosterBackground(
      layout.background_mood,
      brandSystemPrompt,
      dimensions
    );

    // STAGE 4: Upload to permanent storage
    await setStage(posterId, "storage");
    logger.info("Stage 4: Storing poster background", { posterId });
    const permanentUrl = await storePosterBackground(replicateCdnUrl, userId, posterId);

    // Mark as complete
    await supabase
      .from("posters")
      .update({
        layout_json: layout,
        background_url: permanentUrl,
        status: "completed",
      })
      .eq("id", posterId);

    await supabase
      .from("poster_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("poster_id", posterId);

    await logWorkflow({
      workflowName: "poster_generation",
      entityId: posterId,
      entityType: "posters",
      userId,
      status: "completed",
      duration_ms: Date.now() - logStart,
      metadata: { format, textLayers: layout.text_layers?.length },
    });

    logger.info("Poster generation completed", {
      jobId: job.id,
      posterId,
      duration_ms: Date.now() - logStart,
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
