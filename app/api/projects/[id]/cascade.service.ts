import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const PHOTO_BUCKET = "project-photos";
const AUDIO_BUCKET = "project-audio";

type EntryStorageReference = {
  entry_type: "text" | "photo" | "audio";
  photo_url: string | null;
  audio_url: string | null;
};

function extractStoragePath(url: string | null, bucket: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const bucketIndex = segments.findIndex((segment) => segment === bucket);
    if (bucketIndex === -1) return null;
    const path = segments.slice(bucketIndex + 1);
    return path.length ? decodeURIComponent(path.join("/")) : null;
  } catch {
    return null;
  }
}

export async function deleteStorageForEntries(entries: EntryStorageReference[]): Promise<boolean> {
  const photoPaths = entries
    .map((entry) => extractStoragePath(entry.photo_url, PHOTO_BUCKET))
    .filter((path): path is string => Boolean(path));
  const audioPaths = entries
    .map((entry) => extractStoragePath(entry.audio_url, AUDIO_BUCKET))
    .filter((path): path is string => Boolean(path));

  if (photoPaths.length) {
    const { error } = await supabaseAdmin.storage.from(PHOTO_BUCKET).remove(photoPaths);
    if (error) {
      console.error("[api/projects/:id] Failed to delete photo files", { photoPaths, error });
      return false;
    }
  }

  if (audioPaths.length) {
    const { error } = await supabaseAdmin.storage.from(AUDIO_BUCKET).remove(audioPaths);
    if (error) {
      console.error("[api/projects/:id] Failed to delete audio files", { audioPaths, error });
      return false;
    }
  }

  return true;
}

export async function getEntriesForDeletion(projectId: string, companyId: string) {
  return supabaseAdmin
    .from("project_entries")
    .select("id, entry_type, text_content, photo_url, audio_url, created_by, created_at")
    .eq("project_id", projectId)
    .eq("company_id", companyId);
}

export async function deleteEntries(projectId: string, companyId: string) {
  return supabaseAdmin
    .from("project_entries")
    .delete()
    .eq("project_id", projectId)
    .eq("company_id", companyId);
}

export async function deleteProject(projectId: string, companyId: string) {
  return supabaseAdmin
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("company_id", companyId);
}
