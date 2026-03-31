import { supabase } from "../services/supabase.service";
import { chat } from "../services/openrouter.service";
import { runImageModel } from "../services/replicate.service";
import { downloadAndUpload } from "../services/storage.service";
import { logger } from "../logger";

// ── STEP 1: Reference Image Finder ───────────────────────────
// Finds the single reference image whose style best matches the user's prompt.
// Uses OpenRouter → Gemini Pro to pick from a numbered list.

export async function findBestReferenceImage(
  userPrompt: string,
  brandId: string
): Promise<ReferenceImage | null> {
  // Fetch all reference images for this brand
  const { data: refs, error } = await supabase
    .from("reference_images")
    .select("id, image_url, style_description, content_description")
    .eq("brand_id", brandId);

  if (error) throw new Error(`Failed to fetch reference images: ${error.message}`);
  if (!refs || refs.length === 0) return null;

  // Format the reference data for the AI
  const refList = refs
    .map(
      (r, i) =>
        `[${i + 1}] Style: ${r.style_description} | Content: ${r.content_description ?? "N/A"}`
    )
    .join("\n");

  const response = await chat({
    model: process.env.MODEL_STYLE_FINDER!,
    messages: [
      {
        role: "system",
        content: `You are a visual style matcher. You receive a user's image request and a list of reference image styles. Your job is to select the single reference image whose visual style would best serve as inspiration for the user's request. Respond with ONLY the number of the best match, nothing else. Example response: 3`,
      },
      {
        role: "user",
        content: `User request: '${userPrompt}'\n\nReference images:\n${refList}`,
      },
    ],
    temperature: 0.1,
  });

  // Parse response to get the selected index
  const selectedIndex = parseInt(response.content.trim(), 10) - 1;
  const selected = refs[selectedIndex] ?? refs[0]; // Fallback to first if parsing fails

  logger.info("Reference image selected", {
    brandId,
    selectedIndex: selectedIndex + 1,
    totalRefs: refs.length,
  });

  return selected as ReferenceImage;
}

// ── STEP 2: Mega Prompt Builder ───────────────────────────────
// Expands the user's simple prompt into a rich, detailed alpha_prompt.
// The brand's system_prompt is used as the AI's system message (its visual DNA).

export async function buildMegaPrompt(
  userPrompt: string,
  referenceStyle: string,
  brandSystemPrompt: string
): Promise<string> {
  const response = await chat({
    model: process.env.MODEL_PROMPT_BUILDER!,
    messages: [
      {
        role: "system",
        content: brandSystemPrompt || "You are an expert image prompt engineer.",
      },
      {
        role: "user",
        content: `Create a detailed image generation prompt for this request.

USER REQUEST: ${userPrompt}

REFERENCE STYLE TO FOLLOW:
${referenceStyle || "No specific style reference — use the brand's visual DNA from your system instructions."}

RULES:
- Keep the user's subject exactly as they described it
- Apply the brand's visual language from your system instructions
- Incorporate the reference style's lighting, texture, and camera approach
- Output ONLY the final image prompt, no explanations, no preamble
- Maximum 200 words`,
      },
    ],
    temperature: 0.7,
    maxTokens: 400,
  });

  const alphaPrompt = response.content.trim();
  logger.info("Alpha prompt built", { length: alphaPrompt.length });
  return alphaPrompt;
}

// ── STEP 3: Parallel Image Generation ────────────────────────
// Generates N images simultaneously using Promise.all.
// Total time ≈ time to generate 1 image, regardless of N.

export async function generateImages(
  prompt: string,
  count: number,
  aspectRatio: string,
  resolution: string
): Promise<string[]> {
  // Map resolution to Flux width/height
  const resolutionMap: Record<string, { width: number; height: number }> = {
    "1K": { width: 1024, height: 1024 },
    "2K": { width: 2048, height: 2048 },
    "4K": { width: 3840, height: 2160 },
  };

  // Map aspect ratio to actual dimensions
  const dims = resolutionMap[resolution] ?? { width: 1024, height: 1024 };
  let width = dims.width;
  let height = dims.height;

  // Adjust dimensions for aspect ratio
  if (aspectRatio === "16:9") {
    height = Math.round(width * (9 / 16));
  } else if (aspectRatio === "9:16") {
    height = Math.round(width * (16 / 9));
    [width, height] = [height, width];
  }

  // Create N promises — all start simultaneously
  const promises = Array.from({ length: count }, (_, i) =>
    runImageModel({
      model: process.env.MODEL_IMAGE_GEN!,
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        output_format: "png",
        output_quality: 95,
        seed: Math.floor(Math.random() * 1_000_000) + i, // Different seed per image
      },
    })
  );

  // Wait for ALL of them to finish. Total time = slowest single image.
  const results = await Promise.all(promises);

  logger.info("Images generated", { count, aspectRatio, resolution });
  return results;
}

// ── STEP 4: Storage Upload ────────────────────────────────────
// Replicate returns temporary CDN URLs that expire.
// Download each and upload to Supabase Storage permanently.

export async function downloadAndStore(
  replicateUrls: string[],
  userId: string
): Promise<string[]> {
  const storedUrls = await Promise.all(
    replicateUrls.map(async (url, i) => {
      const filename = `${userId}/${Date.now()}-${i}.png`;
      const permanentUrl = await downloadAndUpload(
        url,
        "generated-images",
        filename,
        "image/png"
      );
      return permanentUrl;
    })
  );

  logger.info("Images stored permanently", { count: storedUrls.length });
  return storedUrls;
}

// ── Internal types ────────────────────────────────────────────
export interface ReferenceImage {
  id: string;
  image_url: string;
  style_description: string;
  content_description: string | null;
}
