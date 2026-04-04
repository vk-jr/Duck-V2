// ============================================================
// DUCK — Shared TypeScript Types
// Single source of truth for all database entities and job payloads
// ============================================================

// ── Status Enums ─────────────────────────────────────────────

export type BrandStatus = "pending" | "ready" | "failed";

export type GeneratedImageStatus =
  | "pending"
  | "generating"
  | "completed"
  | "failed";

export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "retrying";

export type QualityCheckStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type WorkflowStatus = "started" | "completed" | "failed";

export type AspectRatio = "1:1" | "16:9" | "9:16";

export type Resolution = "1K" | "2K" | "4K";

export type ImageCount = 1 | 2 | 4;

export type QualityGrade = "PASS" | "WARN" | "FAIL";

export type AnalysisResult = "Match" | "Mismatch" | "N/A";

// ── Database Entities ─────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  created_by: string;
  system_prompt: string | null;
  brand_guidelines: BrandGuidelines | null;
  status: BrandStatus;
  created_at: string;
  updated_at: string;
}

export interface BrandMember {
  brand_id: string;
  user_id: string;
  role: "owner" | "editor" | "member";
  created_at: string;
}

export interface BrandImage {
  id: string;
  brand_id: string;
  image_url: string;
  numbering: number;
  created_at: string;
}

export interface ReferenceImage {
  id: string;
  brand_id: string;
  brand_image_id: string;
  image_url: string;
  filename: string | null;
  content_description: string | null;
  style_description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface GeneratedImage {
  id: string;
  brand_id: string;
  created_by: string;
  user_prompt: string;
  alpha_prompt: string | null;
  image_url: string | null; // Comma-separated URLs
  image_count: ImageCount;
  aspect_ratio: AspectRatio;
  resolution: Resolution;
  status: GeneratedImageStatus;
  error_message: string | null;
  created_at: string;
}

export interface ImageGenerationJob {
  id: string;
  generated_image_id: string;
  bull_job_id: string | null;
  status: JobStatus;
  attempt_count: number;
  error_details: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface QualityCheck {
  id: string;
  user_id: string;
  brand_id: string;
  image_url: string;
  status: QualityCheckStatus;
  result: QualityCheckResult | null;
  score: number | null;
  error_message: string | null;
  created_at: string;
}

export interface WorkflowLog {
  id: string;
  workflow_name: string;
  entity_id: string;
  entity_type: string;
  user_id: string | null;
  status: WorkflowStatus;
  duration_ms: number | null;
  metadata: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  created_at: string;
}

// ── Quality Check Result Schema ───────────────────────────────
// The structured JSON returned by the AI quality agent (Section 14.3)

export interface QualityAnalysisItem {
  result: AnalysisResult;
  detail: string;
}

export interface QualityCheckResult {
  compliance_score: number; // 0-100
  grade: QualityGrade;      // PASS (80-100), WARN (60-79), FAIL (0-59)
  color_analysis: QualityAnalysisItem;
  typography_analysis: QualityAnalysisItem;
  logo_analysis: QualityAnalysisItem;
  aesthetic_analysis: QualityAnalysisItem;
  improvement_actions: string[];
}

// ── BullMQ Job Payloads ───────────────────────────────────────

export interface ImageGenerationJobPayload {
  generatedImageId: string;
  userId: string;
  brandId: string;
  prompt: string;
  imageCount: ImageCount;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  inputImageUrl?: string; // V3: present for img2img jobs (FLUX Kontext), absent for txt2img
}

export interface BrandCreationJobPayload {
  brandId: string;
  userId: string;
  imageUrls: string[];
}

export interface QualityCheckJobPayload {
  type: "create_guidelines" | "check";
  brandId: string;
  userId: string;
  // For create_guidelines:
  imageUrl?: string;
  instructions?: string;
  // For check:
  qualityCheckId?: string;
}

// ── Extended types with joined data ──────────────────────────
// Used in frontend components that need related data

export interface BrandWithImages extends Brand {
  brand_images: BrandImage[];
}

export interface GeneratedImageWithBrand extends GeneratedImage {
  brand: Pick<Brand, "id" | "name"> | null;
}

export interface QualityCheckWithBrand extends QualityCheck {
  brand: Pick<Brand, "id" | "name"> | null;
}

// ── Brand Guidelines ─────────────────────────────────────────

export interface BrandColor {
  name: string;   // "Electric Yellow"
  hex: string;    // "#F9FF49"
  rgb: string;    // "249, 255, 73"
}

export interface BrandFont {
  name: string;                               // "Space Grotesk"
  role: "primary" | "secondary" | "accent";
  weights: string[];                          // ["Regular", "Medium", "Semibold", "Bold"]
  usage: string;                              // "Headlines, UI elements"
}

export interface BrandGuidelines {
  primary_colors: BrandColor[];
  secondary_colors: BrandColor[];
  fonts: BrandFont[];
  has_logo: boolean;
  logo_description: string | null;
  brand_personality: string[];
}

// ── Server Action Response ────────────────────────────────────

export interface ActionResult<T = void> {
  success?: boolean;
  data?: T;
  error?: string;
}

// ── V4: Poster Studio ─────────────────────────────────────────

export type PosterFormat =
  | "square"
  | "portrait_a4"
  | "landscape_16_9"
  | "story_9_16";

export type PosterStatus = "pending" | "generating" | "completed" | "failed";

export type PosterStage =
  | "generating"
  | "segmenting"
  | "analysing"
  | "designing"
  | "background"
  | "finishing";

export const POSTER_DIMENSIONS: Record<PosterFormat, { width: number; height: number }> = {
  square:         { width: 1080, height: 1080 },
  portrait_a4:    { width: 794,  height: 1123 },
  landscape_16_9: { width: 1920, height: 1080 },
  story_9_16:     { width: 1080, height: 1920 },
};

export const POSTER_FORMAT_LABELS: Record<PosterFormat, string> = {
  square:         "Square (1080×1080) — Instagram, LinkedIn",
  portrait_a4:    "Portrait A4 (794×1123) — Hiring posters, flyers",
  landscape_16_9: "Landscape 16:9 (1920×1080) — Presentations, banners",
  story_9_16:     "Story 9:16 (1080×1920) — Instagram / WhatsApp Stories",
};

export interface PosterTextLayer {
  id: string;
  content: string;
  font_size: number;
  font_weight: string;
  font_family?: string;         // Google Font name (optional — falls back to Inter)
  color: string;
  position_x: number;           // percentage of canvas width (0–100)
  position_y: number;           // percentage of canvas height (0–100)
  alignment: "left" | "center" | "right";
  max_width_percent: number;
  letter_spacing?: number;      // Fabric charSpacing (0–500)
  line_height?: number;         // Fabric lineHeight multiplier (1.0–2.0)
  text_shadow?: boolean;        // drop shadow on this layer
}

// Per-layer position/scale defaults set by Claude based on composition analysis
export interface PosterLayerDefault {
  layer_index: number;
  label: string;                // "foreground" | "midground" | "background_strip" etc.
  position_x: number;          // % of canvas width — centre of layer
  position_y: number;          // % of canvas height — centre of layer
  scale: number;               // 0.5–1.5
  opacity: number;             // 0.0–1.0
}

export interface PosterBackground {
  type: "solid_color" | "ai_image";
  color?: string;              // hex — used when type = "solid_color"
  background_prompt?: string;  // Flux prompt — used when type = "ai_image"
  overlay_opacity: number;     // 0 for solid_color; 0.2–0.6 for ai_image
}

export interface PosterLayout {
  dimensions: { width: number; height: number; format: PosterFormat };
  background: PosterBackground;
  text_layers: PosterTextLayer[];
  layer_stack: {
    z_order: string[];           // e.g. ["background", "layer_2", "layer_1", "layer_0", "text_layers"]
    layer_defaults: PosterLayerDefault[];
  };
  brand_fonts?: string[];        // font names used in this poster (from brand guidelines)
}

// One row from poster_layers table
export interface PosterImageLayer {
  id: string;
  poster_id: string;
  layer_index: number;
  layer_url: string;
  created_at: string;
}

export interface Poster {
  id: string;
  brand_id: string;
  created_by: string;
  user_prompt: string;
  format: PosterFormat;
  source_image_url: string | null; // storage path of user-uploaded reference image
  layout_json: PosterLayout | null;
  background_url: string | null;   // null when background.type = "solid_color"
  status: PosterStatus;
  error_message: string | null;
  created_at: string;
  // Populated by JOIN on poster_layers — sorted by layer_index ascending
  layer_urls?: string[];
}

export interface PosterJob {
  id: string;
  poster_id: string;
  bull_job_id: string | null;
  status: JobStatus;
  current_stage: PosterStage | null;
  attempt_count: number;
  error_details: unknown | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PosterGenerationJobPayload {
  posterId: string;
  userId: string;
  brandId: string;
  prompt: string;
  format: PosterFormat;
  referenceImageUrl?: string; // signed URL for user-uploaded reference image (img2img)
}
