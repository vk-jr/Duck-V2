"use server";

import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase/server";
import { addQualityCheckJob } from "@/lib/queue/producer";
import { checkGuidelinesLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types";

export async function createBrandGuidelines(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { allowed } = await checkGuidelinesLimit(user.id);
  if (!allowed) {
    return { success: false, error: "Rate limit: 5 guideline extractions per day" };
  }

  const brandId = formData.get("brandId") as string;
  const instructions = formData.get("instructions") as string | null;
  const file = formData.get("image") as File | null;

  if (!brandId) return { success: false, error: "Brand is required" };

  // Verify ownership
  const { data: brand } = await service
    .from("brands")
    .select("created_by")
    .eq("id", brandId)
    .single();

  if (!brand || brand.created_by !== user.id) {
    return { success: false, error: "Brand not found" };
  }

  let imageUrl: string | undefined;

  if (file && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" };
    }
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "Image must be under 10MB" };
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${user.id}/${brandId}/guideline-ref.${ext}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await service.storage
      .from("brand-images")
      .upload(storagePath, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      return { success: false, error: "Failed to upload image" };
    }

    const { data: urlData } = service.storage
      .from("brand-images")
      .getPublicUrl(storagePath);

    imageUrl = urlData.publicUrl;
  }

  await addQualityCheckJob({
    type: "create_guidelines",
    brandId,
    userId: user.id,
    imageUrl,
    instructions: instructions ?? undefined,
  });

  return { success: true };
}
