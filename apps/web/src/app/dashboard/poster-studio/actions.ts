"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase/server";
import { addPosterGenerationJob } from "@/lib/queue/producer";
import type { ActionResult, PosterFormat } from "@/types";

const StartPosterSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(500),
  brandId: z.string().uuid("Invalid brand"),
  format: z.enum(["square", "portrait_a4", "landscape_16_9", "story_9_16"]),
});

export async function startPosterGeneration(
  formData: FormData
): Promise<ActionResult<{ posterId: string }>> {
  const supabase = await createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const raw = {
    prompt: formData.get("prompt"),
    brandId: formData.get("brandId"),
    format: formData.get("format"),
  };

  const parsed = StartPosterSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { prompt, brandId, format } = parsed.data;

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

  // Insert poster row
  const { data: poster, error: posterError } = await service
    .from("posters")
    .insert({
      brand_id: brandId,
      created_by: user.id,
      user_prompt: prompt,
      format,
      status: "pending",
    })
    .select("id")
    .single();

  if (posterError || !poster) {
    return { success: false, error: "Failed to create poster request" };
  }

  // Insert job tracking row
  await service.from("poster_jobs").insert({
    poster_id: poster.id,
    status: "queued",
    attempt_count: 0,
  });

  // Enqueue
  await addPosterGenerationJob({
    posterId: poster.id,
    userId: user.id,
    brandId,
    prompt,
    format: format as PosterFormat,
  });

  return { success: true, data: { posterId: poster.id } };
}

export async function deletePoster(posterId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Verify ownership and get background_url for storage cleanup
  const { data: poster } = await service
    .from("posters")
    .select("id, created_by, background_url")
    .eq("id", posterId)
    .single();

  if (!poster || poster.created_by !== user.id) {
    return { success: false, error: "Poster not found" };
  }

  // Delete from storage if background exists
  if (poster.background_url) {
    try {
      // Extract storage path from public URL
      const url = new URL(poster.background_url);
      const pathParts = url.pathname.split("/posters/");
      if (pathParts.length > 1) {
        await service.storage.from("posters").remove([pathParts[1]]);
      }
    } catch {
      // Non-fatal — continue with DB delete
    }
  }

  // Delete poster row (cascades to poster_jobs)
  await service.from("posters").delete().eq("id", posterId);

  revalidatePath("/dashboard/poster-studio");
  return { success: true };
}
