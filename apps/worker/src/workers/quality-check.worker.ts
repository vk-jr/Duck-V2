import type { Job } from "bullmq";
import { supabase, logWorkflow } from "../services/supabase.service";
import { chat, imageMessage } from "../services/openrouter.service";
import { logger } from "../logger";

interface QualityCheckJobData {
  type: "create_guidelines" | "check";
  brandId: string;
  userId: string;
  // For create_guidelines:
  imageUrl?: string;
  instructions?: string;
  // For check:
  qualityCheckId?: string;
}

interface QualityCheckResult {
  compliance_score: number;
  grade: "PASS" | "WARN" | "FAIL";
  color_analysis: { result: string; detail: string };
  typography_analysis: { result: string; detail: string };
  logo_analysis: { result: string; detail: string };
  aesthetic_analysis: { result: string; detail: string };
  improvement_actions: string[];
}

export async function processQualityCheck(
  job: Job<QualityCheckJobData>
): Promise<void> {
  const { type, brandId, userId, imageUrl, instructions, qualityCheckId } =
    job.data;
  const logStart = Date.now();

  if (type === "create_guidelines") {
    await handleCreateGuidelines({ brandId, userId, imageUrl, instructions, logStart, job });
  } else {
    await handleQualityAudit({ brandId, userId, imageUrl, qualityCheckId, logStart, job });
  }
}

// ── Sub-handler: Create Brand Guidelines ─────────────────────

async function handleCreateGuidelines(params: {
  brandId: string;
  userId: string;
  imageUrl?: string;
  instructions?: string;
  logStart: number;
  job: Job;
}): Promise<void> {
  const { brandId, userId, imageUrl, instructions, logStart, job } = params;

  logger.info("Creating brand guidelines", { jobId: job.id, brandId });

  await logWorkflow({
    workflowName: "brand_guidelines",
    entityId: brandId,
    entityType: "brands",
    userId,
    status: "started",
  });

  try {
    const messages = imageUrl
      ? [
          {
            role: "system" as const,
            content: `You are a Brand Compliance Officer. Analyse this brand reference image and extract structured brand guidelines. ${instructions ? `Additional instructions: ${instructions}` : ""}

Output a detailed JSON object with:
{
  "brand_name": "detected brand name if visible, otherwise 'Unknown'",
  "primary_colors": ["#hex1", "#hex2"],
  "secondary_colors": ["#hex3"],
  "typography": {
    "primary_font": "font family name or description",
    "secondary_font": "font family name or description if visible"
  },
  "logo": {
    "description": "logo description",
    "placement": "where logo should be placed",
    "variations": ["primary", "reversed", etc.]
  },
  "visual_style": "paragraph describing overall visual aesthetic and brand personality",
  "dos": ["list of brand guidelines to follow"],
  "donts": ["list of brand guidelines to avoid"]
}`,
          },
          imageMessage(
            imageUrl,
            "Extract complete brand guidelines from this reference image."
          ),
        ]
      : [
          {
            role: "user" as const,
            content: `Create brand guidelines. ${instructions ?? ""}`,
          },
        ];

    const response = await chat({
      model: process.env.MODEL_STYLE_FINDER!,
      messages,
      temperature: 0.2,
      responseFormat: { type: "json_object" },
    });

    let guidelines: Record<string, unknown>;
    try {
      guidelines = JSON.parse(response.content) as Record<string, unknown>;
    } catch {
      guidelines = { raw: response.content };
    }

    // Store as text in brands.brand_guidelines
    await supabase
      .from("brands")
      .update({
        brand_guidelines: JSON.stringify(guidelines, null, 2),
        updated_at: new Date().toISOString(),
      })
      .eq("id", brandId);

    await logWorkflow({
      workflowName: "brand_guidelines",
      entityId: brandId,
      entityType: "brands",
      userId,
      status: "completed",
      duration_ms: Date.now() - logStart,
    });

    logger.info("Brand guidelines created", { brandId });
  } catch (error) {
    const err = error as Error;
    logger.error("Create guidelines failed", { brandId, error: err.message });

    await logWorkflow({
      workflowName: "brand_guidelines",
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

// ── Sub-handler: Quality Audit ────────────────────────────────

async function handleQualityAudit(params: {
  brandId: string;
  userId: string;
  imageUrl?: string;
  qualityCheckId?: string;
  logStart: number;
  job: Job;
}): Promise<void> {
  const { brandId, userId, imageUrl, qualityCheckId, logStart, job } = params;

  if (!qualityCheckId || !imageUrl) {
    throw new Error("qualityCheckId and imageUrl are required for check type");
  }

  logger.info("Quality audit started", {
    jobId: job.id,
    qualityCheckId,
    brandId,
  });

  await logWorkflow({
    workflowName: "quality_check",
    entityId: qualityCheckId,
    entityType: "quality_checks",
    userId,
    status: "started",
  });

  try {
    // Update status to processing
    await supabase
      .from("quality_checks")
      .update({ status: "processing" })
      .eq("id", qualityCheckId);

    // Fetch brand guidelines
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("brand_guidelines, name")
      .eq("id", brandId)
      .single();

    if (brandError || !brand?.brand_guidelines) {
      throw new Error(
        `Brand guidelines not found: ${brandError?.message ?? "guidelines empty"}`
      );
    }

    // PHASE 1: Analyse the submitted image
    logger.info("Phase 1: Analysing submitted image");

    const imageAnalysis = await chat({
      model: process.env.MODEL_STYLE_FINDER!,
      messages: [
        {
          role: "system",
          content:
            "You are a visual design analyst. Describe this image in detail focusing on: colours used (with hex estimates where possible), typography visible, logo presence and placement, overall aesthetic and mood, and any design elements.",
        },
        imageMessage(
          imageUrl,
          "Analyse this image and describe all visual elements in detail."
        ),
      ],
      temperature: 0.2,
    });

    // PHASE 2: Compliance Check — compare image analysis against brand guidelines
    logger.info("Phase 2: Checking compliance against brand guidelines");

    const COMPLIANCE_RESULT_SCHEMA = `{
  "compliance_score": <integer 0-100>,
  "grade": "<PASS|WARN|FAIL>",
  "color_analysis": {
    "result": "<Match|Mismatch|N/A>",
    "detail": "<specific explanation>"
  },
  "typography_analysis": {
    "result": "<Match|Mismatch|N/A>",
    "detail": "<specific explanation>"
  },
  "logo_analysis": {
    "result": "<Match|Mismatch|N/A>",
    "detail": "<specific explanation>"
  },
  "aesthetic_analysis": {
    "result": "<Match|Mismatch|N/A>",
    "detail": "<specific explanation>"
  },
  "improvement_actions": ["<specific action 1>", "<specific action 2>"]
}`;

    const complianceResponse = await chat({
      model: process.env.MODEL_PROMPT_BUILDER!,
      messages: [
        {
          role: "system",
          content: `You are a Brand Compliance Checker for the brand "${brand.name}".

Here are the official brand guidelines you must enforce:
${brand.brand_guidelines}

Your job is to check if submitted images comply with these guidelines.
Scoring: PASS = 80-100, WARN = 60-79, FAIL = 0-59.
Output ONLY a JSON object matching this exact schema:
${COMPLIANCE_RESULT_SCHEMA}`,
        },
        {
          role: "user",
          content: `Here is the analysis of the submitted image:\n\n${imageAnalysis.content}\n\nCheck this image against the brand guidelines and output the compliance result JSON.`,
        },
      ],
      temperature: 0.1,
      responseFormat: { type: "json_object" },
    });

    let result: QualityCheckResult;
    try {
      result = JSON.parse(complianceResponse.content) as QualityCheckResult;

      // Ensure grade is calculated correctly
      if (result.compliance_score >= 80) result.grade = "PASS";
      else if (result.compliance_score >= 60) result.grade = "WARN";
      else result.grade = "FAIL";
    } catch {
      throw new Error("Failed to parse compliance result JSON from AI");
    }

    // Update quality_checks row with result
    await supabase
      .from("quality_checks")
      .update({
        status: "completed",
        result,
        score: result.compliance_score,
      })
      .eq("id", qualityCheckId);

    await logWorkflow({
      workflowName: "quality_check",
      entityId: qualityCheckId,
      entityType: "quality_checks",
      userId,
      status: "completed",
      duration_ms: Date.now() - logStart,
      metadata: { score: result.compliance_score, grade: result.grade },
    });

    logger.info("Quality audit completed", {
      qualityCheckId,
      score: result.compliance_score,
      grade: result.grade,
    });
  } catch (error) {
    const err = error as Error;
    logger.error("Quality audit failed", {
      qualityCheckId,
      error: err.message,
    });

    await supabase
      .from("quality_checks")
      .update({ status: "failed", error_message: err.message })
      .eq("id", qualityCheckId);

    await logWorkflow({
      workflowName: "quality_check",
      entityId: qualityCheckId,
      entityType: "quality_checks",
      userId,
      status: "failed",
      duration_ms: Date.now() - logStart,
      error: { message: err.message },
    });

    throw error;
  }
}
