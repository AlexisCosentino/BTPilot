import { Buffer } from "buffer";

import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const PHOTO_BUCKET = "project-photos";
export const AUDIO_BUCKET = "project-audio";

export async function ensureBucketExists(bucket: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.storage.getBucket(bucket);
  if (data) return true;

  if (error && error.message && !error.message.toLowerCase().includes("not found")) {
    console.error("[api/projects/:id/entries] Bucket lookup failed", { bucket, error });
    return false;
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
    public: true
  });

  if (createError) {
    console.error("[api/projects/:id/entries] Bucket creation failed", { bucket, error: createError });
    return false;
  }

  return true;
}

export async function uploadFileToStorage(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, { contentType: file.type || undefined, upsert: false });

  if (uploadError) {
    console.error("[api/projects/:id/entries] File upload failed", { bucket, path, uploadError });
    return null;
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);

  return publicUrlData?.publicUrl ?? null;
}
