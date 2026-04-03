import { chat } from "../services/openrouter.service";
import { runImageModel } from "../services/replicate.service";
import { downloadAndUpload } from "../services/storage.service";
import { logger } from "../logger";

// Strip markdown code fences that some models wrap around JSON responses
function parseJsonResponse<T>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(stripped) as T;
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
  font_family: string;
  color: string;
  position_x: number;
  position_y: number;
  alignment: "left" | "center" | "right";
  max_width_percent: number;
  letter_spacing: number;
  line_height: number;
  text_shadow: boolean;
}

export interface PosterLayout {
  dimensions: { width: number; height: number; format: PosterFormat };
  background_mood: string;
  text_layers: PosterTextLayer[];
  overlay_opacity: number;
  overlay_style: "flat" | "gradient_bottom";
}

export interface PosterIntent {
  poster_type: string;
  headline: string;
  subheadline: string;
  body_points: string[];
  call_to_action: string;
  tone: string;
}

// ── STAGE 1: Extract Poster Intent ───────────────────────────
// Claude reads the user's prompt and returns structured content
// intent — what the poster is about, not how it looks.

export async function extractPosterIntent(
  userPrompt: string
): Promise<PosterIntent> {
  const response = await chat({
    model: process.env.MODEL_POSTER_INTENT!,
    messages: [
      {
        role: "system",
        content:
          "You are a poster content strategist. Analyse the user's request. Respond ONLY in JSON with no markdown fences.",
      },
      {
        role: "user",
        content: `Analyse this poster request and extract the content intent.

USER REQUEST: ${userPrompt}

Respond with ONLY a JSON object matching this schema:
{
  "poster_type": "string (e.g. job posting, product launch, event, announcement)",
  "headline": "string (main headline, punchy and short)",
  "subheadline": "string (supporting line, 1-2 sentences)",
  "body_points": ["string", "string"],
  "call_to_action": "string (e.g. Apply Now, Learn More, Visit us)",
  "tone": "string (e.g. professional, vibrant, minimal)"
}`,
      },
    ],
    responseFormat: { type: "json_object" },
    temperature: 0.3,
    maxTokens: 500,
  });

  const intent = parseJsonResponse<PosterIntent>(response.content);
  logger.info("Poster intent extracted", {
    poster_type: intent.poster_type,
    tone: intent.tone,
  });
  return intent;
}

// ── STAGE 2: Build Poster Layout ─────────────────────────────
// Claude takes the intent and brand visual DNA and produces a
// complete PosterLayout JSON with text layers and background mood.

export async function buildPosterLayout(
  intent: PosterIntent,
  brandSystemPrompt: string,
  dimensions: { width: number; height: number; format: PosterFormat }
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
        content: `Design a complete poster layout for the following content intent.

CONTENT INTENT:
${JSON.stringify(intent, null, 2)}

CANVAS DIMENSIONS: ${dimensions.width}px × ${dimensions.height}px (format: ${dimensions.format})

AVAILABLE GOOGLE FONTS — choose the most on-brand option per layer:
  Impact/bold:       "Oswald", "Bebas Neue", "Montserrat"
  Elegant/editorial: "Playfair Display", "Cormorant Garamond"
  Modern/clean:      "Poppins", "Raleway", "DM Sans"
  Body/readable:     "Lato", "Source Sans 3"
Pick font_family based on layer role and brand tone ("${intent.tone}").
Headline layers → impact or elegant fonts. Body/CTA → modern or readable fonts.

LAYOUT RULES:
- Use ONLY the brand's colour palette from your system instructions
- Headline font_size: 72–120px, font_weight: "bold"
- Subheadline font_size: 36–56px, font_weight: "semibold"
- Body text font_size: 20–28px, font_weight: "normal"
- Call-to-action font_size: 28–40px, font_weight: "bold"
- position_x and position_y are percentages of canvas width/height (0–100)
- max_width_percent is percentage of canvas width (0–100) for text wrapping
- overlay_opacity: 0.3–0.75 (dark overlay for text legibility)
- overlay_style: "gradient_bottom" for most posters (cinematic depth, transparent top → dark bottom); "flat" only for bright minimal designs
- background_mood: describe a PURE VISUAL scene with NO text, NO words, NO typography, NO letters
- font_family: MUST be one of the exact font names listed above — no other values allowed
- letter_spacing: 0–20 for body text; 50–200 for headlines and CTA (Fabric charSpacing units)
- line_height: 1.0–1.3 for headlines; 1.4–1.8 for body text (multiplier)
- text_shadow: true for headline and CTA layers; false for body/subheadline layers

Respond with ONLY a JSON object matching this schema exactly:
{
  "dimensions": { "width": number, "height": number, "format": string },
  "background_mood": "string (visual description, absolutely no text in image)",
  "overlay_opacity": number,
  "overlay_style": "flat|gradient_bottom",
  "text_layers": [
    {
      "id": "string",
      "content": "string",
      "font_size": number,
      "font_weight": "normal|semibold|bold",
      "font_family": "string (exact name from font catalogue)",
      "color": "#hexcolor",
      "position_x": number,
      "position_y": number,
      "alignment": "left|center|right",
      "max_width_percent": number,
      "letter_spacing": number,
      "line_height": number,
      "text_shadow": boolean
    }
  ]
}`,
      },
    ],
    responseFormat: { type: "json_object" },
    temperature: 0.5,
    maxTokens: 2000,
  });

  const layout = parseJsonResponse<PosterLayout>(response.content);
  logger.info("Poster layout built", {
    textLayers: layout.text_layers?.length,
    overlayOpacity: layout.overlay_opacity,
  });
  return layout;
}

// ── STAGE 3: Generate Poster Background ──────────────────────
// Step 3a: Claude builds an image prompt from the background mood.
// Step 3b: Flux 1.1 Pro generates a pure visual background (no text).
// Returns the temporary Replicate CDN URL.

export async function generatePosterBackground(
  backgroundMood: string,
  brandSystemPrompt: string,
  dimensions: { width: number; height: number }
): Promise<string> {
  // Step 3a: Build image generation prompt
  const promptResponse = await chat({
    model: process.env.MODEL_POSTER_BG_PROMPT!,
    messages: [
      {
        role: "system",
        content:
          brandSystemPrompt ||
          "You are an expert image prompt engineer for brand-consistent visual backgrounds.",
      },
      {
        role: "user",
        content: `Write a Flux image generation prompt for a poster background.

BACKGROUND MOOD: ${backgroundMood}

STRICT RULES:
- The background must be PURELY VISUAL — absolutely NO text, NO typography, NO words, NO letters, NO numbers
- Apply the brand's visual style (colours, mood, aesthetic) from your system instructions
- Describe lighting, texture, composition, colour palette
- Maximum 150 words
- Output ONLY the final image prompt, no explanations`,
      },
    ],
    temperature: 0.6,
    maxTokens: 300,
  });

  const imagePrompt = promptResponse.content.trim();
  logger.info("Poster background prompt built", { length: imagePrompt.length });

  // Determine aspect ratio from dimensions
  const ratio = dimensions.width / dimensions.height;
  let aspectRatio = "1:1";
  if (ratio > 1.3) aspectRatio = "16:9";
  else if (ratio < 0.8) aspectRatio = "9:16";

  // Step 3b: Generate background image
  const replicateCdnUrl = await runImageModel({
    model: process.env.MODEL_POSTER_BG_IMAGE!,
    input: {
      prompt: imagePrompt,
      aspect_ratio: aspectRatio,
      output_format: "png",
      output_quality: 95,
      seed: Math.floor(Math.random() * 1_000_000),
    },
  });

  logger.info("Poster background generated");
  return replicateCdnUrl;
}

// ── STAGE 4: Upload Background to Permanent Storage ───────────

export async function storePosterBackground(
  replicateCdnUrl: string,
  userId: string,
  posterId: string
): Promise<string> {
  const storagePath = `${userId}/${posterId}/background.png`;
  const permanentUrl = await downloadAndUpload(
    replicateCdnUrl,
    "posters",
    storagePath,
    "image/png"
  );
  logger.info("Poster background stored permanently", { storagePath });
  return permanentUrl;
}
