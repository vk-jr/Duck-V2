"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase/server";
import { parseImageUrls } from "@/lib/utils";
import type { ActionResult } from "@/types";

export async function deleteGeneratedImage(imageId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Verify ownership
  const { data: img } = await service
    .from("generated_images")
    .select("id, created_by, image_url")
    .eq("id", imageId)
    .single();

  if (!img || img.created_by !== user.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Delete from storage
  const urls = parseImageUrls(img.image_url);
  const storagePaths = urls
    .map((url) => {
      try {
        const u = new URL(url);
        return u.pathname.split("/generated-images/")[1];
      } catch {
        return null;
      }
    })
    .filter(Boolean) as string[];

  if (storagePaths.length) {
    await service.storage.from("generated-images").remove(storagePaths);
  }

  // Delete DB row
  await service.from("generated_images").delete().eq("id", imageId);

  revalidatePath("/dashboard/gallery");
  return { success: true };
}
