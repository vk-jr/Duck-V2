"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase/server";
import { addPosterGenerationJob } from "@/lib/queue/producer";
import { checkPosterGenerationLimit } from "@/lib/rate-limit";
import type { ActionResult, PosterFormat } from "@/types";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

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

  const { allowed } = await checkPosterGenerationLimit(user.id);
  if (!allowed) return { success: false, error: "Daily poster limit reached. Try again tomorrow." };

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

  // Validate reference image if provided
  const referenceFile = formData.get("referenceImage");
  let referenceImageUrl: string | undefined;
  let sourceImagePath: string | undefined;

  if (referenceFile instanceof File && referenceFile.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(referenceFile.type)) {
      return { success: false, error: "Reference image must be JPEG, PNG, or WebP" };
    }
    if (referenceFile.size > MAX_IMAGE_BYTES) {
      return { success: false, error: "Reference image must be under 10 MB" };
    }

    // Validate actual file bytes — file.type is client-controlled and can be spoofed
    const hdr = new Uint8Array(await referenceFile.slice(0, 12).arrayBuffer());
    const isJpeg = hdr[0] === 0xFF && hdr[1] === 0xD8;
    const isPng  = hdr[0] === 0x89 && hdr[1] === 0x50 && hdr[2] === 0x4E && hdr[3] === 0x47;
    const isWebp = hdr[0] === 0x52 && hdr[1] === 0x49 && hdr[2] === 0x46 && hdr[3] === 0x46
                && hdr[8] === 0x57 && hdr[9] === 0x45 && hdr[10] === 0x42 && hdr[11] === 0x50;
    if (!isJpeg && !isPng && !isWebp) {
      return { success: false, error: "Reference image must be JPEG, PNG, or WebP" };
    }

    // We need the posterId for the storage path — generate it now
    const tempPosterId = crypto.randomUUID();
    const ext = referenceFile.type === "image/png" ? "png" : referenceFile.type === "image/webp" ? "webp" : "jpg";
    const storagePath = `${user.id}/${tempPosterId}/reference.${ext}`;

    const buffer = await referenceFile.arrayBuffer();
    const { error: uploadError } = await service.storage
      .from("poster-inputs")
      .upload(storagePath, buffer, { contentType: referenceFile.type });

    if (uploadError) {
      return { success: false, error: "Failed to upload reference image" };
    }

    // Generate 1-hour signed URL — Replicate (img2img) fetches it during pipeline
    const { data: signedData, error: signedError } = await service.storage
      .from("poster-inputs")
      .createSignedUrl(storagePath, 3600);

    if (signedError || !signedData) {
      return { success: false, error: "Failed to prepare reference image" };
    }

    referenceImageUrl = signedData.signedUrl;
    sourceImagePath = storagePath;

    // Insert poster row with known ID
    const { data: poster, error: posterError } = await service
      .from("posters")
      .insert({
        id: tempPosterId,
        brand_id: brandId,
        created_by: user.id,
        user_prompt: prompt,
        format,
        source_image_url: sourceImagePath,
        status: "pending",
      })
      .select("id")
      .single();

    if (posterError || !poster) {
      return { success: false, error: "Failed to create poster request" };
    }

    await service.from("poster_jobs").insert({
      poster_id: poster.id,
      status: "queued",
      attempt_count: 0,
    });

    await addPosterGenerationJob({
      posterId: poster.id,
      userId: user.id,
      brandId,
      prompt,
      format: format as PosterFormat,
      referenceImageUrl,
    });

    return { success: true, data: { posterId: poster.id } };
  }

  // No reference image — text-only path
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

  await service.from("poster_jobs").insert({
    poster_id: poster.id,
    status: "queued",
    attempt_count: 0,
  });

  await addPosterGenerationJob({
    posterId: poster.id,
    userId: user.id,
    brandId,
    prompt,
    format: format as PosterFormat,
  });

  return { success: true, data: { posterId: poster.id } };
}

// Accepts the canvas export as a base64 data URL, uploads as JPEG preview,
// and stores the URL in posters.preview_url.
export async function savePosterPreview(
  posterId: string,
  dataUrl: string
): Promise<ActionResult<{ previewUrl: string }>> {
  const supabase = await createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Verify ownership
  const { data: poster } = await service
    .from("posters")
    .select("id, created_by")
    .eq("id", posterId)
    .single();

  if (!poster || poster.created_by !== user.id) {
    return { success: false, error: "Poster not found" };
  }

  // Convert base64 data URL to buffer
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  if (!base64 || base64.length > 5 * 1024 * 1024) {
    return { success: false, error: "Preview image is invalid or too large" };
  }
  const buffer = Buffer.from(base64, "base64");

  const storagePath = `${user.id}/${posterId}/preview.jpg`;

  const { error: uploadError } = await service.storage
    .from("poster-layers")
    .upload(storagePath, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    return { success: false, error: "Failed to upload preview" };
  }

  const { data: urlData } = service.storage
    .from("poster-layers")
    .getPublicUrl(storagePath);

  const previewUrl = urlData.publicUrl;

  await service
    .from("posters")
    .update({ preview_url: previewUrl })
    .eq("id", posterId);

  return { success: true, data: { previewUrl } };
}

export async function deletePoster(posterId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Fetch poster + all its layers for storage cleanup
  const { data: poster } = await service
    .from("posters")
    .select("id, created_by, background_url, source_image_url, poster_layers(layer_url)")
    .eq("id", posterId)
    .single();

  if (!poster || poster.created_by !== user.id) {
    return { success: false, error: "Poster not found" };
  }

  // Delete transparent PNG layers from poster-layers bucket
  const layers = (poster.poster_layers ?? []) as Array<{ layer_url: string }>;
  for (const layer of layers) {
    try {
      const url = new URL(layer.layer_url);
      const pathParts = url.pathname.split("/poster-layers/");
      if (pathParts.length > 1) {
        await service.storage.from("poster-layers").remove([pathParts[1]]);
      }
    } catch {
      // Non-fatal
    }
  }

  // Delete AI-generated canvas background
  if (poster.background_url) {
    try {
      const url = new URL(poster.background_url);
      const pathParts = url.pathname.split("/poster-backgrounds/");
      if (pathParts.length > 1) {
        await service.storage.from("poster-backgrounds").remove([pathParts[1]]);
      }
    } catch {
      // Non-fatal — also check old "posters" bucket for v3 records
      try {
        const url = new URL(poster.background_url);
        const pathParts = url.pathname.split("/posters/");
        if (pathParts.length > 1) {
          await service.storage.from("posters").remove([pathParts[1]]);
        }
      } catch {
        // Non-fatal
      }
    }
  }

  // Delete reference image from poster-inputs bucket
  if (poster.source_image_url) {
    try {
      await service.storage.from("poster-inputs").remove([poster.source_image_url]);
    } catch {
      // Non-fatal
    }
  }

  // Delete poster row (cascades to poster_layers and poster_jobs)
  await service.from("posters").delete().eq("id", posterId);

  revalidatePath("/dashboard/poster-studio");
  return { success: true };
}
