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
  brand_guidelines: string | null;
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

// ── Server Action Response ────────────────────────────────────

export interface ActionResult<T = void> {
  success?: boolean;
  data?: T;
  error?: string;
}
