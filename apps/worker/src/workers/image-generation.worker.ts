import type { Job } from "bullmq";
import { supabase, logWorkflow } from "../services/supabase.service";
import {
  findBestReferenceImage,
  buildMegaPrompt,
  generateImages,
  generateImagesFromInput,
  downloadAndStore,
} from "../pipeline/image-pipeline";
import { logger } from "../logger";

interface ImageGenerationJobData {
  generatedImageId: string;
  userId: string;
  brandId: string;
  prompt: string;
  imageCount: 1 | 2 | 4;
  aspectRatio: string;
  resolution: string;
  inputImageUrl?: string; // V3: present for img2img jobs
}

export async function processImageGeneration(
  job: Job<ImageGenerationJobData>
): Promise<void> {
  const {
    generatedImageId,
    userId,
    brandId,
    prompt,
    imageCount,
    aspectRatio,
    resolution,
    inputImageUrl,
  } = job.data;

  const logStart = Date.now();

  logger.info("Image generation started", {
    jobId: job.id,
    generatedImageId,
    brandId,
    imageCount,
  });

  await logWorkflow({
    workflowName: "image_generation",
    entityId: generatedImageId,
    entityType: "generated_images",
    userId,
    status: "started",
    metadata: { jobId: job.id, imageCount, aspectRatio, resolution },
  });

  try {
    // Update status to 'generating' so frontend shows spinner
    await supabase
      .from("generated_images")
      .update({ status: "generating" })
      .eq("id", generatedImageId);

    // Update job tracking
    await supabase
      .from("image_generation_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("generated_image_id", generatedImageId);

    // Fetch brand system prompt
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("system_prompt")
      .eq("id", brandId)
      .single();

    if (brandError || !brand) {
      throw new Error(`Brand not found: ${brandError?.message ?? "unknown"}`);
    }

    // STEP 1: Find best reference image
    logger.info("Step 1: Finding best reference image", { brandId });
    const bestRef = await findBestReferenceImage(prompt, brandId);

    // STEP 2: Build mega prompt
    logger.info("Step 2: Building mega prompt");
    const alphaPrompt = await buildMegaPrompt(
      prompt,
      bestRef?.style_description ?? "",
      brand.system_prompt ?? ""
    );

    // STEP 3: Generate images — fork on whether a product image was uploaded
    if (inputImageUrl) {
      logger.info("Step 3: img2img via FLUX Kontext", { count: imageCount, inputImageUrl });
    } else {
      logger.info("Step 3: txt2img via Flux 1.1 Pro", { count: imageCount });
    }
    const replicateUrls = inputImageUrl
      ? await generateImagesFromInput(alphaPrompt, inputImageUrl, imageCount, aspectRatio)
      : await generateImages(alphaPrompt, imageCount, aspectRatio, resolution);

    // STEP 4: Upload to permanent storage
    logger.info("Step 4: Uploading to Supabase Storage");
    const permanentUrls = await downloadAndStore(replicateUrls, userId);

    // Mark as complete in DB
    await supabase
      .from("generated_images")
      .update({
        status: "completed",
        image_url: permanentUrls.join(","),
        alpha_prompt: alphaPrompt,
      })
      .eq("id", generatedImageId);

    await supabase
      .from("image_generation_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("generated_image_id", generatedImageId);

    await logWorkflow({
      workflowName: "image_generation",
      entityId: generatedImageId,
      entityType: "generated_images",
      userId,
      status: "completed",
      duration_ms: Date.now() - logStart,
      metadata: { imageCount, urls: permanentUrls.length },
    });

    logger.info("Image generation completed", {
      jobId: job.id,
      generatedImageId,
      duration_ms: Date.now() - logStart,
    });
  } catch (error) {
    const err = error as Error;
    logger.error("Image generation failed", {
      jobId: job.id,
      generatedImageId,
      error: err.message,
      stack: err.stack,
      attempt: job.attemptsMade,
    });

    // Only mark as failed after all retries are exhausted
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3) - 1;

    if (isLastAttempt) {
      await supabase
        .from("generated_images")
        .update({
          status: "failed",
          error_message: err.message,
        })
        .eq("id", generatedImageId);

      await supabase
        .from("image_generation_jobs")
        .update({
          status: "failed",
          error_details: { message: err.message, stack: err.stack },
          completed_at: new Date().toISOString(),
        })
        .eq("generated_image_id", generatedImageId);

      await logWorkflow({
        workflowName: "image_generation",
        entityId: generatedImageId,
        entityType: "generated_images",
        userId,
        status: "failed",
        duration_ms: Date.now() - logStart,
        error: { message: err.message },
      });
    } else {
      // Update retry count in jobs table
      await supabase
        .from("image_generation_jobs")
        .update({
          status: "retrying",
          attempt_count: job.attemptsMade + 1,
          error_details: { message: err.message },
        })
        .eq("generated_image_id", generatedImageId);
    }

    // Re-throw so BullMQ knows the job failed and can retry
    throw error;
  }
}
