import { chat, imageMessage } from "../services/openrouter.service";
import { runImageModel, runImageModelMulti } from "../services/replicate.service";
import { downloadAndUpload } from "../services/storage.service";
import { supabase } from "../services/supabase.service";
import { logger } from "../logger";

// Strip markdown fences and extract the first complete JSON object from the response.
function parseJsonResponse<T>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(stripped) as T;
  } catch {
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

// ── Local Types ────────────────────────────────────────────────

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
  brand_fonts?: string[];
}

export interface CompositionAnalysis {
  subject_position: string;
  subject_bounds: { x: number; y: number; w: number; h: number };
  empty_zones: string[];
  composition_direction: string;
  dominant_colors: string[];
  mood: string;
}

// Brand guidelines types (mirrors web/src/types/index.ts)
export interface BrandColor {
  name: string;
  hex: string;
  rgb: string;
}

export interface BrandFont {
  name: string;
  role: "primary" | "secondary" | "accent";
  weights: string[];
  usage: string;
}

export interface BrandGuidelines {
  primary_colors: BrandColor[];
  secondary_colors: BrandColor[];
  fonts: BrandFont[];
  has_logo: boolean;
  logo_description: string | null;
  brand_personality: string[];
}

// ── STAGE 1a: Build hero image generation prompt ──────────────
// Writes an art-directed poster background prompt.
// Uses brand palette and personality to steer away from generic imagery.
// Model-agnostic — works with any image generation model.

export async function buildHeroImagePrompt(
  userPrompt: string,
  brandSystemPrompt: string,
  brandGuidelines: BrandGuidelines | null,
  referenceImageUrl?: string
): Promise<string> {
  // Build color palette section from structured brand guidelines
  const paletteLines = [
    ...(brandGuidelines?.primary_colors ?? []).map(
      (c) => `  ${c.hex} — ${c.name} (primary)`
    ),
    ...(brandGuidelines?.secondary_colors ?? []).map(
      (c) => `  ${c.hex} — ${c.name} (secondary)`
    ),
  ];
  const colorSection = paletteLines.length
    ? `BRAND COLOUR PALETTE (these must dominate the image):\n${paletteLines.join("\n")}`
    : "";

  const personality = brandGuidelines?.brand_personality?.length
    ? `BRAND PERSONALITY: ${brandGuidelines.brand_personality.join(", ")}`
    : "";

  const referenceNote = referenceImageUrl
    ? "\nA reference image is attached — incorporate its subject as a focal design element in the composition."
    : "";

  // Strip control characters to prevent prompt injection via newline injection
  const safePrompt = userPrompt.replace(/[\r\n\x00-\x08\x0B-\x1F\x7F]+/g, " ").trim();

  const textContent = `Write a poster background image generation prompt.

POSTER BRIEF: """${safePrompt}"""${referenceNote}

${colorSection}

${personality}

ART DIRECTION:
- Designed poster background, NOT a photograph or stock image
- Graphic design / editorial aesthetic — agency-quality poster art
- Colour story dominated entirely by the brand palette above
- Abstract or conceptual visual that relates thematically to the brief
- Bold high-contrast composition with generous empty zones for text overlay
- No text, no typography, no UI elements, no logos anywhere
- Think: Pentagram, IDEO, Wolff Olins level of craft and intentionality

Output ONLY the image prompt — maximum 200 words. No explanation.`;

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
          "You are an expert art director specialising in brand-consistent poster design. Write image generation prompts that produce editorial-quality poster backgrounds with strong graphic design aesthetics.",
      },
      ...messages,
    ],
    temperature: 0.7,
    maxTokens: 400,
  });

  const prompt = response.content.trim();
  logger.info("Hero image prompt built", {
    length: prompt.length,
    hasReference: !!referenceImageUrl,
  });
  return prompt;
}

// ── STAGE 1b: Generate hero image ────────────────────────────
// txt2img if no reference image; img2img if reference provided.
// Returns the temporary CDN URL from the image model provider.

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

// ── STAGE 2: Segmentation ─────────────────────────────────────
// Segments the hero image into up to 8 transparent PNG layers.
// Downloads each layer and uploads to the poster-layers bucket.
// Inserts one row per layer into poster_layers table.

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
      num_layers: 8,
      description: "auto",
      output_format: "png",
      output_quality: 95,
    },
  });

  logger.info("Segmentation complete", { layerCount: replicateLayerUrls.length });

  await supabase.from("poster_layers").delete().eq("poster_id", posterId);

  const permanentUrls = await Promise.all(
    replicateLayerUrls.map(async (url, i) => {
      const storagePath = `${userId}/${posterId}/layer-${i}.png`;
      return downloadAndUpload(url, "poster-layers", storagePath, "image/png", true);
    })
  );

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
  "subject_bounds": { "x": number, "y": number, "w": number, "h": number },
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
    maxTokens: 2000,
  });

  const analysis = parseJsonResponse<CompositionAnalysis>(response.content);
  logger.info("Composition analysis complete", {
    subject_position: analysis.subject_position,
    empty_zones: analysis.empty_zones,
  });
  return analysis;
}

// ── STAGE 4 helper: Compute layer_stack ──────────────────────

function computeLayerStack(
  composition: CompositionAnalysis,
  layerCount: number
): PosterLayout["layer_stack"] {
  const { subject_bounds } = composition;
  const cx = subject_bounds.x + subject_bounds.w / 2;
  const cy = subject_bounds.y + subject_bounds.h / 2;

  const layer_defaults: PosterLayerDefault[] = Array.from(
    { length: layerCount },
    (_, i) => {
      const depth = i / Math.max(layerCount - 1, 1);
      return {
        layer_index: i,
        label:
          i === 0
            ? "foreground"
            : i === layerCount - 1
            ? "background_strip"
            : `mid_${i}`,
        position_x: cx + (50 - cx) * depth * 0.25,
        position_y: cy + (50 - cy) * depth * 0.25,
        scale: 1.0 - depth * 0.08,
        opacity: i === 0 ? 1.0 : 1.0 - depth * 0.15,
      };
    }
  );

  const imageLayerIds = Array.from(
    { length: layerCount },
    (_, i) => `layer_${layerCount - 1 - i}`
  );

  return {
    z_order: ["background", ...imageLayerIds, "text_layers"],
    layer_defaults,
  };
}

// ── STAGE 4: Layout & text design ────────────────────────────
// Claude generates background spec + text layers using brand fonts and colors.
// brand_fonts[] is included in the output so the canvas editor can populate
// the font picker with the correct options.

type ClaudeLayoutOutput = {
  dimensions: { width: number; height: number; format: PosterFormat };
  background: PosterBackground;
  text_layers: PosterTextLayer[];
  brand_fonts?: string[];
};

export async function buildPosterLayout(
  userPrompt: string,
  composition: CompositionAnalysis,
  brandSystemPrompt: string,
  brandGuidelines: BrandGuidelines | null,
  dimensions: { width: number; height: number; format: PosterFormat },
  layerCount: number
): Promise<PosterLayout> {
  const brandFonts = brandGuidelines?.fonts ?? [];

  // Font section — use brand fonts if available, fallback list otherwise
  const fontSection = brandFonts.length
    ? `BRAND TYPOGRAPHY — use ONLY these fonts (they are the brand's identity):
${brandFonts
  .map(
    (f) =>
      `  "${f.name}" [${f.role}] — ${f.usage}. Available weights: ${f.weights.join(", ")}`
  )
  .join("\n")}`
    : `FALLBACK FONTS (no brand fonts detected — pick the most appropriate):
  Bold/impact: "Oswald", "Bebas Neue", "Montserrat"
  Elegant:     "Playfair Display", "Cormorant Garamond"
  Modern:      "Poppins", "Raleway", "DM Sans"
  Readable:    "Lato", "Source Sans 3"`;

  // Color section — use exact hex values from brand guidelines
  const allColors = [
    ...(brandGuidelines?.primary_colors ?? []),
    ...(brandGuidelines?.secondary_colors ?? []),
  ];
  const colorSection = allColors.length
    ? `BRAND COLOURS — use ONLY these exact hex values for all text and background colours:
${allColors.map((c) => `  ${c.hex} — ${c.name}`).join("\n")}`
    : "Use colours from the brand palette in your system instructions.";

  const exampleFont = brandFonts[0]?.name ?? "Montserrat";
  const exampleFontList = brandFonts.length
    ? brandFonts.map((f) => `"${f.name}"`).join(", ")
    : '"Montserrat"';

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

POSTER REQUEST: """${userPrompt.replace(/[\r\n\x00-\x08\x0B-\x1F\x7F]+/g, " ").trim()}"""
CANVAS: ${dimensions.width}×${dimensions.height}px (format: ${dimensions.format})

IMAGE COMPOSITION ANALYSIS:
${JSON.stringify(composition, null, 2)}

${fontSection}

${colorSection}

LAYOUT RULES:
1. Place text ONLY inside the empty_zones listed above.
2. NEVER place any text_layer within the subject_bounds area.
3. Font sizes: headline 72–120px, subheadline 36–56px, body 20–28px, CTA 22–32px.
4. position_x and position_y are % of canvas (0–100), centre of each text block.
5. max_width_percent is the text box width as % of canvas width.
6. background.type = "solid_color" uses a brand hex color; "ai_image" adds a background_prompt (no people, no text).
7. brand_fonts: list every unique font name you used across all text_layers.

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
      "font_family": "${exampleFont}",
      "color": "#hex",
      "position_x": 25,
      "position_y": 20,
      "alignment": "left",
      "max_width_percent": 45,
      "letter_spacing": 100,
      "line_height": 1.1,
      "text_shadow": true
    }
  ],
  "brand_fonts": [${exampleFontList}]
}`,
      },
    ],
    responseFormat: { type: "json_object" },
    temperature: 0.5,
    maxTokens: 2000,
  });

  const partial = parseJsonResponse<ClaudeLayoutOutput>(response.content);

  const layout: PosterLayout = {
    ...partial,
    layer_stack: computeLayerStack(composition, layerCount),
  };

  logger.info("Poster layout designed", {
    textLayers: layout.text_layers?.length,
    backgroundType: layout.background?.type,
    imageLayers: layerCount,
    brandFonts: layout.brand_fonts,
  });
  return layout;
}

// ── STAGE 5: Canvas background generation (conditional) ───────

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

  const cdnUrl = await runImageModel({
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
    cdnUrl,
    "poster-backgrounds",
    storagePath,
    "image/png"
  );

  logger.info("Canvas background generated and stored", { storagePath });
  return permanentUrl;
}
