import { type Database } from "../../../../../lib/supabaseAdmin";

export type EntryType = Database["public"]["Enums"]["project_entry_type"];
export type EntrySubtype = "task" | "client_change" | null;

export const ALLOWED_ENTRY_SUBTYPES: EntrySubtype[] = ["task", "client_change"];
export const ALLOWED_ENTRY_TYPES: EntryType[] = ["text", "photo", "audio"];
export const PHOTO_SIZE_LIMIT_BYTES = 1_000_000;
export const AUDIO_SIZE_LIMIT_BYTES = 3_000_000;

export function parseEntrySubtype(value: FormDataEntryValue | string | null): EntrySubtype {
  if (typeof value !== "string") return null;
  return ALLOWED_ENTRY_SUBTYPES.includes(value as EntrySubtype) ? (value as EntrySubtype) : null;
}

export function sanitizeExtension(mime: string | null): string {
  if (!mime) return "bin";
  const candidate = mime.split("/")[1] ?? "bin";
  const safe = candidate.replace(/[^a-zA-Z0-9]/g, "");
  return safe || "bin";
}
