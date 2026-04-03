"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase/server";
import { addBrandCreationJob } from "@/lib/queue/producer";
import type { ActionResult } from "@/types";

async function verifyBrandOwnership(brandId: string, userId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("brands")
    .select("id, created_by")
    .eq("id", brandId)
    .single();

  return data?.created_by === userId;
}

export async function deleteBrand(brandId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const isOwner = await verifyBrandOwnership(brandId, user.id);
  if (!isOwner) return { success: false, error: "Unauthorized" };

  // Delete storage files in brand-images bucket
  const { data: brandImages } = await service
    .from("brand_images")
    .select("image_url")
    .eq("brand_id", brandId);

  if (brandImages?.length) {
    const paths = brandImages
      .map((img) => {
        const url = new URL(img.image_url);
        return url.pathname.split("/brand-images/")[1];
      })
      .filter(Boolean);

    if (paths.length) {
      await service.storage.from("brand-images").remove(paths);
    }
  }

  // Delete brand (cascades to brand_images, reference_images)
  await service.from("brands").delete().eq("id", brandId);

  revalidatePath("/dashboard/brands");
  redirect("/dashboard/brands");
}

export async function updateBrandSystemPrompt(
  brandId: string,
  prompt: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const isOwner = await verifyBrandOwnership(brandId, user.id);
  if (!isOwner) return { success: false, error: "Unauthorized" };

  const { error } = await service
    .from("brands")
    .update({ system_prompt: prompt })
    .eq("id", brandId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/brand/${brandId}`);
  return { success: true };
}

export async function retryBrandAnalysis(brandId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const isOwner = await verifyBrandOwnership(brandId, user.id);
  if (!isOwner) return { success: false, error: "Unauthorized" };

  const { data: brand } = await service
    .from("brands")
    .select("status")
    .eq("id", brandId)
    .single();

  if (brand?.status !== "failed" && brand?.status !== "pending") {
    return { success: false, error: "Brand must be in failed or pending state to retry" };
  }

  const { data: brandImages } = await service
    .from("brand_images")
    .select("image_url")
    .eq("brand_id", brandId);

  if (!brandImages?.length) {
    return { success: false, error: "No images found for this brand" };
  }

  await service
    .from("brands")
    .update({ status: "pending" })
    .eq("id", brandId);

  await addBrandCreationJob(
    {
      brandId,
      userId: user.id,
      imageUrls: brandImages.map((img) => img.image_url),
    },
    `brand-${brandId}-retry-${Date.now()}`
  );

  revalidatePath(`/dashboard/brand/${brandId}`);
  return { success: true };
}
