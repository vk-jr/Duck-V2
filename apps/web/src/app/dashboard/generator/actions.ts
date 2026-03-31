"use server";

import { z } from "zod";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase/server";
import { addImageGenerationJob } from "@/lib/queue/producer";
import { checkImageGenerationLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types";

const GenerateSchema = z.object({
  brandId: z.string().uuid("Invalid brand"),
  prompt: z.string().min(1, "Prompt is required").max(1000),
  imageCount: z.coerce.number().refine((v) => [1, 2, 4].includes(v), "Must be 1, 2, or 4"),
  aspectRatio: z.enum(["1:1", "16:9", "9:16"]),
  resolution: z.enum(["1K", "2K", "4K"]),
});

export async function startGeneration(
  formData: FormData
): Promise<ActionResult<{ generatedImageId: string }>> {
  const supabase = await createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Rate limit
  const { allowed } = await checkImageGenerationLimit(user.id);
  if (!allowed) {
    return { success: false, error: "Rate limit reached: 10 generations per hour" };
  }

  // Validate
  const raw = {
    brandId: formData.get("brandId"),
    prompt: formData.get("prompt"),
    imageCount: formData.get("imageCount"),
    aspectRatio: formData.get("aspectRatio"),
    resolution: formData.get("resolution"),
  };

  const parsed = GenerateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { brandId, prompt, imageCount, aspectRatio, resolution } = parsed.data;

  // Verify brand ownership and ready status
  const { data: brand } = await service
    .from("brands")
    .select("id, status, created_by")
    .eq("id", brandId)
    .single();

  if (!brand || brand.created_by !== user.id) {
    return { success: false, error: "Brand not found" };
  }
  if (brand.status !== "ready") {
    return { success: false, error: "Brand is not ready yet" };
  }

  // Insert generated_images row
  const { data: genImage, error: genError } = await service
    .from("generated_images")
    .insert({
      brand_id: brandId,
      created_by: user.id,
      user_prompt: prompt,
      image_count: imageCount,
      aspect_ratio: aspectRatio,
      resolution,
      status: "pending",
    })
    .select("id")
    .single();

  if (genError || !genImage) {
    return { success: false, error: "Failed to create generation request" };
  }

  // Insert job tracking row
  await service.from("image_generation_jobs").insert({
    generated_image_id: genImage.id,
    status: "queued",
    attempt_count: 0,
  });

  // Enqueue
  await addImageGenerationJob({
    generatedImageId: genImage.id,
    userId: user.id,
    brandId,
    prompt,
    imageCount: imageCount as 1 | 2 | 4,
    aspectRatio,
    resolution,
  });

  return { success: true, data: { generatedImageId: genImage.id } };
}
