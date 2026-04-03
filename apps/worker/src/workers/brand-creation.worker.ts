import type { Job } from "bullmq";
import { supabase, logWorkflow } from "../services/supabase.service";
import { chat, imageMessage } from "../services/openrouter.service";
import { extractBrandGuidelines } from "../pipeline/image-pipeline";
import { logger } from "../logger";

interface BrandCreationJobData {
  brandId: string;
  userId: string;
  imageUrls: string[];
}

interface ImageAnalysis {
  content_description: string;
  style_description: string;
}

// ── Brand Visual Style Architect Prompt ──────────────────────
// Synthesises all reference image styles into a single master system_prompt.
// This becomes the AI brain of the brand — used for every future generation.

const BRAND_ARCHITECT_SYSTEM_PROMPT = `You are an expert Brand Visual Style Architect. Your job is to analyse multiple image style descriptions and synthesise them into a single, definitive visual identity guide for a brand.

You will receive style descriptions from multiple reference images. Extract and document:
1. LIGHTING SIGNATURE: How is light used? (dramatic, soft, natural, studio, etc.)
2. MATERIAL & TEXTURE: Surface qualities, graininess, smoothness, organic vs. synthetic
3. CAMERA BEHAVIOUR: Angle, lens choice, focal length feel, depth of field, framing rules
4. COLOUR PALETTE: Primary and secondary colours, how they are used, saturation levels, temperature
5. IMPERFECTION STYLE: Film grain, noise, artifacts, deliberate imperfections or clinical perfection
6. COMPOSITION RULES: Rule of thirds, centering, negative space, symmetry, geometric patterns
7. AESTHETIC MOOD: The overall emotional tone and feeling the brand's visuals evoke

Output a structured system prompt (1500-2500 words) that can be given to any AI image generation model as a system message to make it produce brand-consistent results. Write it as a direct guide for the image generator: "You generate images in the visual style of [Brand]. Your images always feature..."`;

export async function processBrandCreation(
  job: Job<BrandCreationJobData>
): Promise<void> {
  const { brandId, userId, imageUrls } = job.data;
  const logStart = Date.now();

  logger.info("Brand creation started", {
    jobId: job.id,
    brandId,
    imageCount: imageUrls.length,
  });

  await logWorkflow({
    workflowName: "brand_creation",
    entityId: brandId,
    entityType: "brands",
    userId,
    status: "started",
    metadata: { jobId: job.id, imageCount: imageUrls.length },
  });

  try {
    // Fetch brand — includes existing system_prompt and brand_guidelines
    // so we can skip steps that already completed on a previous attempt.
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("name, system_prompt, brand_guidelines")
      .eq("id", brandId)
      .single();

    if (brandError || !brand) {
      throw new Error(`Brand not found: ${brandError?.message ?? "empty"}`);
    }

    // Fetch brand images with their numbering to link back
    const { data: brandImages, error: imgError } = await supabase
      .from("brand_images")
      .select("id, image_url, numbering")
      .eq("brand_id", brandId)
      .order("numbering", { ascending: true });

    if (imgError || !brandImages?.length) {
      throw new Error(`No brand images found: ${imgError?.message ?? "empty"}`);
    }

    // STEP 1: Analyse each image — idempotent on retry.
    // Load any analyses already stored from a previous attempt so we only
    // call the vision API for images that haven't been processed yet.
    const { data: existingRefs } = await supabase
      .from("reference_images")
      .select("brand_image_id, content_description, style_description")
      .eq("brand_id", brandId);

    const cachedByImageId = new Map(
      (existingRefs ?? []).map((r) => [r.brand_image_id, r])
    );

    const toAnalyse = brandImages.filter((img) => !cachedByImageId.has(img.id));

    logger.info("Step 1: Analysing brand images", {
      total: brandImages.length,
      alreadyCached: brandImages.length - toAnalyse.length,
      toAnalyse: toAnalyse.length,
    });

    await Promise.all(
      toAnalyse.map(async (img) => {
        const response = await chat({
          model: process.env.MODEL_STYLE_FINDER!,
          messages: [
            {
              role: "system",
              content: `You are a professional visual style analyst. Analyse the image provided and output a JSON object with exactly these two fields:
{
  "content_description": "What is in the image — subjects, objects, people, scene, setting, products",
  "style_description": "The complete visual style — lighting quality and direction, texture and material feel, camera angle and lens characteristics, colour palette and treatment, mood, composition style, any film grain or processing artifacts, depth of field, overall aesthetic"
}
Output ONLY the JSON object, no other text.`,
            },
            imageMessage(
              img.image_url,
              "Analyse this brand reference image. Describe both the content and the visual style in detail."
            ),
          ],
          temperature: 0.3,
          responseFormat: { type: "json_object" },
        });

        let analysis: ImageAnalysis;
        try {
          analysis = JSON.parse(response.content) as ImageAnalysis;
        } catch {
          analysis = {
            content_description: "Brand reference image",
            style_description: response.content,
          };
        }

        // Insert — if another concurrent retry already stored this, ignore the conflict
        const { error: refError } = await supabase
          .from("reference_images")
          .insert({
            brand_id: brandId,
            brand_image_id: img.id,
            image_url: img.image_url,
            filename: `image-${img.numbering}`,
            content_description: analysis.content_description,
            style_description: analysis.style_description,
            metadata: { numbering: img.numbering },
          });

        if (refError) {
          logger.warn("reference_image insert skipped (duplicate on retry)", {
            brandId,
            imageId: img.id,
            error: refError.message,
          });
        }

        // Add to cache so Step 2 can read it
        cachedByImageId.set(img.id, {
          brand_image_id: img.id,
          content_description: analysis.content_description,
          style_description: analysis.style_description,
        });
      })
    );

    // Build ordered analysis list from cache (covers both fresh + pre-existing)
    const analysisResults: ImageAnalysis[] = brandImages.map((img) => {
      const r = cachedByImageId.get(img.id);
      return {
        content_description: r?.content_description ?? "",
        style_description: r?.style_description ?? "",
      };
    });

    logger.info("All images analysed", { count: analysisResults.length });

    // STEP 2: Synthesise all style descriptions into one master system_prompt
    // Skipped on retry if system_prompt was already built in a previous attempt.
    let masterSystemPrompt = brand.system_prompt ?? "";
    if (!masterSystemPrompt) {
      const stylesSummary = analysisResults
        .map(
          (a, i) =>
            `Image ${i + 1}:\nContent: ${a.content_description}\nStyle: ${a.style_description}`
        )
        .join("\n\n---\n\n");

      logger.info("Step 2: Building master system prompt from all styles");

      const masterResponse = await chat({
        model: process.env.MODEL_PROMPT_BUILDER!,
        messages: [
          {
            role: "system",
            content: BRAND_ARCHITECT_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Here are the style analyses of all ${analysisResults.length} brand reference images:\n\n${stylesSummary}\n\nSynthesize these into a comprehensive brand visual identity guide (system prompt).`,
          },
        ],
        temperature: 0.5,
        maxTokens: 3000,
      });

      masterSystemPrompt = masterResponse.content.trim();
    } else {
      logger.info("Step 2: Skipping — system_prompt already exists", { brandId });
    }

    // STEP 3: Extract structured brand guidelines.
    // Skipped on retry if guidelines were already extracted in a previous attempt.
    // Uses the freshly-fetched brandImages URLs (same ones that worked in Step 1).
    let brandGuidelines = (brand.brand_guidelines as object | null) ?? null;
    if (!brandGuidelines) {
      logger.info("Step 3: Extracting brand guidelines", { brandId });
      const freshImageUrls = brandImages.map((img) => img.image_url);
      brandGuidelines = await extractBrandGuidelines(
        brand.name,
        masterSystemPrompt,
        freshImageUrls
      );
      logger.info("Brand guidelines extracted", { brandId });
    } else {
      logger.info("Step 3: Skipping — brand_guidelines already exists", { brandId });
    }

    // STEP 4: Update brand — only write fields that were actually regenerated this run.
    const updatePayload: Record<string, unknown> = {
      status: "ready",
      updated_at: new Date().toISOString(),
    };
    if (!brand.system_prompt) updatePayload.system_prompt = masterSystemPrompt;
    if (!brand.brand_guidelines) updatePayload.brand_guidelines = brandGuidelines;

    const { error: updateError } = await supabase
      .from("brands")
      .update(updatePayload)
      .eq("id", brandId);

    if (updateError) {
      throw new Error(`Failed to update brand: ${updateError.message}`);
    }

    await logWorkflow({
      workflowName: "brand_creation",
      entityId: brandId,
      entityType: "brands",
      userId,
      status: "completed",
      duration_ms: Date.now() - logStart,
      metadata: {
        imagesAnalysed: analysisResults.length,
        systemPromptLength: masterSystemPrompt.length,
      },
    });

    logger.info("Brand creation completed", {
      jobId: job.id,
      brandId,
      duration_ms: Date.now() - logStart,
    });
  } catch (error) {
    const err = error as Error;
    logger.error("Brand creation failed", {
      jobId: job.id,
      brandId,
      error: err.message,
      stack: err.stack,
    });

    // Mark brand as failed
    await supabase
      .from("brands")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", brandId);

    await logWorkflow({
      workflowName: "brand_creation",
      entityId: brandId,
      entityType: "brands",
      userId,
      status: "failed",
      duration_ms: Date.now() - logStart,
      error: { message: err.message },
    });

    throw error;
  }
}
