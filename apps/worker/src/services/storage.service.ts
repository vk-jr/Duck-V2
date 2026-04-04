import { supabase } from "./supabase.service";
import { logger } from "../logger";

// Download a temporary URL (e.g. from Replicate) and upload to Supabase Storage permanently

export async function downloadAndUpload(
  sourceUrl: string,
  bucket: string,
  storagePath: string,
  contentType: string = "image/png",
  upsert: boolean = false
): Promise<string> {
  // Download the image
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download image from ${sourceUrl}: ${response.status}`
    );
  }

  const buffer = await response.arrayBuffer();

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType,
      upsert,
    });

  if (uploadError) {
    logger.error("Supabase Storage upload failed", {
      bucket,
      storagePath,
      error: uploadError.message,
    });
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Return the permanent public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

// Upload a Buffer/ArrayBuffer directly to storage (used for quality-check images)
export async function uploadBuffer(
  buffer: ArrayBuffer,
  bucket: string,
  storagePath: string,
  contentType: string = "image/jpeg"
): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

// Delete a file from storage by its public URL or path
export async function deleteStorageFile(
  bucket: string,
  storagePath: string
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) {
    logger.warn("Failed to delete storage file", { bucket, storagePath, error: error.message });
  }
}
