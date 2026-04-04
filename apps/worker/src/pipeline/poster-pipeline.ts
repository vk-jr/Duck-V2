import { chat, imageMessage } from "../services/openrouter.service";
import { runImageModel, runImageModelMulti } from "../services/replicate.service";
import { downloadAndUpload } from "../services/storage.service";
import { supabase } from "../services/supabase.service";
import { logger } from "../logger";

// Strip markdown fences and extract the first complete JSON object from the response.
// Gemini sometimes wraps JSON in prose or truncates — the brace-scan fallback handles both.
function parseJsonResponse<T>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(stripped) as T;
  } catch {
    // Scan for the outermost { … } block and parse that
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1)) as T;
    }
    throw new Error(
      `Failed to parse JSON from model response. Preview: ${stripped.slice(0, 300)}`
    );
  }
}

// ── Local Types (mirror types/index.ts in web) ────────────────

export type PosterFormat =
  | "square"
  | "portrait_a4"
  | "landscape_16_9"
  | "story_9_16";

export interface PosterTextLayer {
  id: string;
  content: string;
  font_size: number;
  font_weight: string;
  font_family?: string;
  color: string;
  position_x: number;
  position_y: number;
  alignment: "left" | "center" | "right";
  max_width_percent: number;
  letter_spacing?: number;
  line_height?: number;
  text_shadow?: boolean;
}

export interface PosterLayerDefault {
  layer_index: number;
  label: string;
  position_x: number;
  position_y: number;
  scale: number;
  opacity: number;
}

export interface PosterBackground {
  type: "solid_color" | "ai_image";
  color?: string;
  background_prompt?: string;
  overlay_opacity: number;
}

export interface PosterLayout {
  dimensions: { width: number; height: number; format: PosterFormat };
  background: PosterBackground;
  text_layers: PosterTextLayer[];
  layer_stack: {
    z_order: string[];
    layer_defaults: PosterLayerDefault[];
  };
}

export interface CompositionAnalysis {
  subject_position: string;
  subject_bounds: { x: number; y: number; w: number; h: number };
  empty_zones: string[];
  composition_direction: string;
  dominant_colors: string[];
  mood: string;
}

// ── STAGE 1a: Build hero image generation prompt ──────────────
// Claude (with brand context + optional vision) writes a Flux prompt.
// If referenceImageUrl is provided, Claude sees the image and
// incorporates its subject/style into the prompt.

export async function buildHeroImagePrompt(
  userPrompt: string,
  brandSystemPrompt: string,
  referenceImageUrl?: string
): Promise<string> {
  const textContent = `Write a Flux image generation prompt for a poster hero image.

POSTER BRIEF: ${userPrompt}
${referenceImageUrl ? "\nA reference image is attached. Incorporate its subject, style, and visual elements into the generated poster image." : ""}

STRICT RULES:
- NO text, NO typography, NO letters, NO numbers anywhere in the image
- Apply the brand's visual style, colour palette, and aesthetic from your system instructions
- Describe the main subject, scene, lighting, composition, and mood in detail
- The image should work as a full-bleed poster background with a clear subject area
- Maximum 200 words
- Output ONLY the image generation prompt — no preamble, no explanation`;

  const messages = referenceImageUrl
    ? [imageMessage(referenceImageUrl, textContent)]
    : [{ role: "user" as const, content: textContent }];

  const response = await chat({
    model: process.env.MODEL_POSTER_LAYOUT!,
    messages: [
      {
        role: "system",
        content:
          brandSystemPrompt ||
          "You are an expert image prompt engineer for brand-consistent visuals.",
      },
      ...messages,
    ],
    temperature: 0.6,
    maxTokens: 400,
  });

  const prompt = response.content.trim();
  logger.info("Hero image prompt built", { length: prompt.length, hasReference: !!referenceImageUrl });
  return prompt;
}

// ── STAGE 1b: Generate hero image via Replicate ───────────────
// txt2img (Flux 1.1 Pro) if no reference image.
// img2img (Flux Kontext Pro) if reference image provided.
// Returns the temporary Replicate CDN URL.

export async function generateHeroImage(
  imagePrompt: string,
  dimensions: { width: number; height: number },
  referenceImageUrl?: string
): Promise<string> {
  const ratio = dimensions.width / dimensions.height;
  let aspectRatio = "1:1";
  if (ratio > 1.3) aspectRatio = "16:9";
  else if (ratio < 0.8) aspectRatio = "9:16";

  let heroUrl: string;

  if (referenceImageUrl) {
    // img2img: Flux Kontext — preserves subject from reference image
    heroUrl = await runImageModel({
      model: process.env.MODEL_IMG2IMG!,
      input: {
        prompt: imagePrompt,
        input_image: referenceImageUrl,
        aspect_ratio: aspectRatio,
        output_format: "png",
        output_quality: 95,
      },
    });
    logger.info("Hero image generated (img2img)");
  } else {
    // txt2img: Flux 1.1 Pro
    heroUrl = await runImageModel({
      model: process.env.MODEL_POSTER_BG_IMAGE!,
      input: {
        prompt: imagePrompt,
        aspect_ratio: aspectRatio,
        output_format: "png",
        output_quality: 95,
        seed: Math.floor(Math.random() * 1_000_000),
      },
    });
    logger.info("Hero image generated (txt2img)");
  }

  return heroUrl;
}

// ── STAGE 2: Qwen segmentation ────────────────────────────────
// Segments the hero image into up to 8 transparent PNG layers.
// Downloads each layer and uploads to the poster-layers bucket.
// Inserts one row per layer into poster_layers table.
// Returns array of permanent Supabase Storage URLs (index = layer_index).

export async function segmentHeroImage(
  heroImageUrl: string,
  userId: string,
  posterId: string
): Promise<string[]> {
  const replicateLayerUrls = await runImageModelMulti({
    model: process.env.MODEL_SEGMENTATION!,
    input: {
      image: heroImageUrl,
      go_fast: true,
      num_layers: 8,          // maximum layers for maximum depth
      description: "auto",
      output_format: "png",
      output_quality: 95,
    },
  });

  logger.info("Qwen segmentation complete", { layerCount: replicateLayerUrls.length });

  // On retries the files and rows from the previous attempt already exist — clean them up first.
  await supabase.from("poster_layers").delete().eq("poster_id", posterId);

  // Download each layer and upload to permanent Supabase Storage.
  // upsert=true so retries overwrite the files from the previous failed attempt.
  const permanentUrls = await Promise.all(
    replicateLayerUrls.map(async (url, i) => {
      const storagePath = `${userId}/${posterId}/layer-${i}.png`;
      const permanentUrl = await downloadAndUpload(
        url,
        "poster-layers",
        storagePath,
        "image/png",
        true  // upsert
      );
      return permanentUrl;
    })
  );

  // Insert one row per layer into poster_layers table
  const { error } = await supabase.from("poster_layers").insert(
    permanentUrls.map((url, i) => ({
      poster_id: posterId,
      layer_index: i,
      layer_url: url,
    }))
  );

  if (error) {
    throw new Error(`Failed to insert poster_layers: ${error.message}`);
  }

  logger.info("Poster layers stored", { count: permanentUrls.length });
  return permanentUrls;
}

// ── STAGE 3: Composition analysis ────────────────────────────
// Gemini Pro Vision analyses the hero image to identify where the
// subject is and which zones are free for text placement.

export async function analyseComposition(
  heroImageUrl: string
): Promise<CompositionAnalysis> {
  const response = await chat({
    model: process.env.MODEL_COMPOSITION_ANALYSER!,
    messages: [
      imageMessage(
        heroImageUrl,
        `Analyse this image's composition and respond ONLY in JSON — no markdown, no explanation.

Schema:
{
  "subject_position": "center" | "left" | "right" | "center-left" | "center-right" | "full-frame",
  "subject_bounds": {
    "x": number,
    "y": number,
    "w": number,
    "h": number
  },
  "empty_zones": ["string"],
  "composition_direction": "left-heavy" | "right-heavy" | "centered" | "full",
  "dominant_colors": ["#hex", "#hex", "#hex"],
  "mood": "string"
}

subject_bounds values are percentages (0–100) of image dimensions.
empty_zones examples: "top-left", "bottom", "left-third", "top-right".
JSON only.`
      ),
    ],
    temperature: 0.1,
    maxTokens: 2000, // 600 was too low — Gemini was truncating the JSON mid-object
  });

  const analysis = parseJsonResponse<CompositionAnalysis>(response.content);
  logger.info("Composition analysis complete", {
    subject_position: analysis.subject_position,
    empty_zones: analysis.empty_zones,
  });
  return analysis;
}

// ── STAGE 4 helper: Compute layer_stack from composition ─────
// Layer positions are purely mathematical — derived from the subject
// bounds that Gemini identified. Claude doesn't need to generate this.
// Layer 0 = foreground (topmost): centred exactly on subject.
// Each deeper layer nudges slightly toward canvas centre for depth.

function computeLayerStack(
  composition: CompositionAnalysis,
  layerCount: number
): PosterLayout["layer_stack"] {
  const { subject_bounds } = composition;
  const cx = subject_bounds.x + subject_bounds.w / 2; // subject centre X %
  const cy = subject_bounds.y + subject_bounds.h / 2; // subject centre Y %

  const layer_defaults: PosterLayerDefault[] = Array.from(
    { length: layerCount },
    (_, i) => {
      const depth = i / Math.max(layerCount - 1, 1); // 0 (foreground) → 1 (deepest)
      return {
        layer_index: i,
        label:
          i === 0
            ? "foreground"
            : i === layerCount - 1
            ? "background_strip"
            : `mid_${i}`,
        // Nudge deeper layers toward canvas centre (50, 50) for parallax depth
        position_x: cx + (50 - cx) * depth * 0.25,
        position_y: cy + (50 - cy) * depth * 0.25,
        scale: 1.0 - depth * 0.08,           // foreground full size; deepest slightly smaller
        opacity: i === 0 ? 1.0 : 1.0 - depth * 0.15,
      };
    }
  );

  // z_order: background canvas → deepest layer → … → foreground → text
  const imageLayerIds = Array.from(
    { length: layerCount },
    (_, i) => `layer_${layerCount - 1 - i}` // deepest first
  );

  return {
    z_order: ["background", ...imageLayerIds, "text_layers"],
    layer_defaults,
  };
}

// ── STAGE 4: Layout & text design ────────────────────────────
// Claude only generates background spec + text layers.
// layer_stack is computed deterministically — not generated by the model.
// This keeps Claude's output small and avoids JSON truncation/corruption.

type ClaudeLayoutOutput = {
  dimensions: { width: number; height: number; format: PosterFormat };
  background: PosterBackground;
  text_layers: PosterTextLayer[];
};

export async function buildPosterLayout(
  userPrompt: string,
  composition: CompositionAnalysis,
  brandSystemPrompt: string,
  dimensions: { width: number; height: number; format: PosterFormat },
  layerCount: number
): Promise<PosterLayout> {
  const response = await chat({
    model: process.env.MODEL_POSTER_LAYOUT!,
    messages: [
      {
        role: "system",
        content:
          brandSystemPrompt ||
          "You are an expert brand-aware graphic designer. Apply the brand's visual language precisely.",
      },
      {
        role: "user",
        content: `Design a poster layout for this request.

POSTER REQUEST: ${userPrompt}
CANVAS: ${dimensions.width}×${dimensions.height}px (format: ${dimensions.format})

IMAGE COMPOSITION ANALYSIS:
${JSON.stringify(composition, null, 2)}

RULES:
1. Place text ONLY inside the empty_zones listed above.
2. NEVER place any text_layer within the subject_bounds area.
3. Use ONLY colours from the brand palette in your system instructions.
4. Font sizes: headline 72–120px, subheadline 36–56px, body 20–28px, CTA 22–32px.
5. position_x and position_y are % of canvas (0–100), centre of each text block.
6. max_width_percent is the text box width as % of canvas width.
7. background.type = "solid_color" if brand has a strong primary colour; else "ai_image" with background_prompt (no people, no text, no letters).

AVAILABLE GOOGLE FONTS:
  Bold/impact: "Oswald", "Bebas Neue", "Montserrat"
  Elegant:     "Playfair Display", "Cormorant Garamond"
  Modern:      "Poppins", "Raleway", "DM Sans"
  Readable:    "Lato", "Source Sans 3"

Respond ONLY in this exact JSON schema — nothing else:
{
  "dimensions": { "width": ${dimensions.width}, "height": ${dimensions.height}, "format": "${dimensions.format}" },
  "background": {
    "type": "solid_color",
    "color": "#hex",
    "overlay_opacity": 0
  },
  "text_layers": [
    {
      "id": "headline",
      "content": "string",
      "font_size": 96,
      "font_weight": "bold",
      "font_family": "Oswald",
      "color": "#hex",
      "position_x": 25,
      "position_y": 20,
      "alignment": "left",
      "max_width_percent": 45,
      "letter_spacing": 100,
      "line_height": 1.1,
      "text_shadow": true
    }
  ]
}`,
      },
    ],
    responseFormat: { type: "json_object" },
    temperature: 0.5,
    maxTokens: 2000,
  });

  const partial = parseJsonResponse<ClaudeLayoutOutput>(response.content);

  // Merge Claude's output with the deterministically computed layer_stack
  const layout: PosterLayout = {
    ...partial,
    layer_stack: computeLayerStack(composition, layerCount),
  };

  logger.info("Poster layout designed", {
    textLayers: layout.text_layers?.length,
    backgroundType: layout.background?.type,
    imageLayers: layerCount,
  });
  return layout;
}

// ── STAGE 5: Canvas background generation (conditional) ───────
// Only runs when layout.background.type = "ai_image".
// Generates a pure visual background (no subject — subject is in layers).
// Returns permanent Supabase Storage URL.

export async function generateCanvasBackground(
  backgroundPrompt: string,
  dimensions: { width: number; height: number },
  userId: string,
  posterId: string
): Promise<string> {
  const ratio = dimensions.width / dimensions.height;
  let aspectRatio = "1:1";
  if (ratio > 1.3) aspectRatio = "16:9";
  else if (ratio < 0.8) aspectRatio = "9:16";

  const replicateCdnUrl = await runImageModel({
    model: process.env.MODEL_POSTER_BG_IMAGE!,
    input: {
      prompt: backgroundPrompt,
      aspect_ratio: aspectRatio,
      output_format: "png",
      output_quality: 95,
      seed: Math.floor(Math.random() * 1_000_000),
    },
  });

  const storagePath = `${userId}/${posterId}/background.png`;
  const permanentUrl = await downloadAndUpload(
    replicateCdnUrl,
    "poster-backgrounds",
    storagePath,
    "image/png"
  );

  logger.info("Canvas background generated and stored", { storagePath });
  return permanentUrl;
}
