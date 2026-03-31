"use server";

import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase/server";
import { addQualityCheckJob } from "@/lib/queue/producer";
import { checkQualityAuditLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types";
import { randomUUID } from "crypto";

export async function startQualityCheck(
  formData: FormData
): Promise<ActionResult<{ qualityCheckId: string }>> {
  const supabase = await createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { allowed } = await checkQualityAuditLimit(user.id);
  if (!allowed) {
    return { success: false, error: "Rate limit: 20 audits per day" };
  }

  const brandId = formData.get("brandId") as string;
  const file = formData.get("image") as File | null;

  if (!brandId) return { success: false, error: "Brand is required" };
  if (!file || file.size === 0) return { success: false, error: "Image is required" };
  if (!file.type.startsWith("image/")) return { success: false, error: "File must be an image" };
  if (file.size > 10 * 1024 * 1024) return { success: false, error: "Image must be under 10MB" };

  // Verify brand has guidelines
  const { data: brand } = await service
    .from("brands")
    .select("created_by, brand_guidelines")
    .eq("id", brandId)
    .single();

  if (!brand || brand.created_by !== user.id) {
    return { success: false, error: "Brand not found" };
  }
  if (!brand.brand_guidelines) {
    return { success: false, error: "This brand has no guidelines. Create guidelines first." };
  }

  // Upload image
  const uuid = randomUUID();
  const ext = file.name.split(".").pop() ?? "jpg";
  const storagePath = `${user.id}/${uuid}/image.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await service.storage
    .from("quality-checks")
    .upload(storagePath, buffer, { contentType: file.type });

  if (uploadError) {
    return { success: false, error: "Failed to upload image" };
  }

  const { data: urlData } = service.storage
    .from("quality-checks")
    .getPublicUrl(storagePath);

  const imageUrl = urlData.publicUrl;

  // Insert quality_checks row
  const { data: qc, error: qcError } = await service
    .from("quality_checks")
    .insert({
      user_id: user.id,
      brand_id: brandId,
      image_url: imageUrl,
      status: "pending",
    })
    .select("id")
    .single();

  if (qcError || !qc) {
    return { success: false, error: "Failed to create check" };
  }

  // Enqueue
  await addQualityCheckJob({
    type: "check",
    qualityCheckId: qc.id,
    brandId,
    userId: user.id,
    imageUrl,
  });

  return { success: true, data: { qualityCheckId: qc.id } };
}
