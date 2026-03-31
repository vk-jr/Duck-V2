"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase/server";
import { addBrandCreationJob } from "@/lib/queue/producer";
import { checkBrandCreationLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types";

const CreateBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(100),
});

export async function createBrand(formData: FormData): Promise<ActionResult<{ brandId: string }>> {
  const supabase = await createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Rate limit
  const { allowed } = await checkBrandCreationLimit(user.id);
  if (!allowed) {
    return { success: false, error: "You can only create 3 brands per day" };
  }

  // Validate name
  const name = formData.get("name");
  const parsed = CreateBrandSchema.safeParse({ name });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // Validate files
  const files = formData.getAll("images") as File[];
  if (!files.length || (files.length === 1 && files[0].size === 0)) {
    return { success: false, error: "At least 1 reference image is required" };
  }
  if (files.length > 10) {
    return { success: false, error: "Maximum 10 reference images" };
  }
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "All files must be images" };
    }
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "Each image must be under 10MB" };
    }
  }

  // Create brand row
  const { data: brand, error: brandError } = await service
    .from("brands")
    .insert({
      name: parsed.data.name,
      created_by: user.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (brandError || !brand) {
    return { success: false, error: "Failed to create brand" };
  }

  const brandId = brand.id;
  const imageUrls: string[] = [];

  // Upload each image
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${user.id}/${brandId}/${i + 1}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await service.storage
      .from("brand-images")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      continue; // skip failed uploads but don't abort
    }

    const { data: urlData } = service.storage
      .from("brand-images")
      .getPublicUrl(storagePath);

    const imageUrl = urlData.publicUrl;
    imageUrls.push(imageUrl);

    // Insert brand_images row
    await service.from("brand_images").insert({
      brand_id: brandId,
      image_url: imageUrl,
      numbering: i + 1,
    });
  }

  if (!imageUrls.length) {
    await service.from("brands").update({ status: "failed" }).eq("id", brandId);
    return { success: false, error: "Failed to upload images" };
  }

  // Enqueue brand creation job
  await addBrandCreationJob({ brandId, userId: user.id, imageUrls });

  redirect(`/dashboard/brand/${brandId}`);
}
