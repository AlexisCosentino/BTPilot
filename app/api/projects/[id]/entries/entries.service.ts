import { supabaseAdmin, type Database } from "../../../../../lib/supabaseAdmin";
import { parseEntrySubtype, type EntrySubtype, type EntryType } from "./validation";

export type TranscriptMetadata = {
  transcript_text?: string | null;
  transcript_model?: string | null;
  transcript_language?: string | null;
  transcript_created_at?: string | null;
  transcript_error?: string | null;
};

export type EntryMetadata = Record<string, unknown> & TranscriptMetadata;

const columnSelect =
  "id, entry_type, text_content, photo_url, audio_url, metadata, created_by, created_at, entry_subtype, is_active, parent_entry_id, superseded_at";

export type EntryResponse = {
  id: string;
  entry_type: EntryType;
  text_content: string | null;
  photo_url: string | null;
  audio_url: string | null;
  metadata: EntryMetadata | null;
  created_by: string;
  created_at: string;
  entry_subtype: EntrySubtype;
  is_active: boolean;
  parent_entry_id: string | null;
  superseded_at: string | null;
};

export type EntryRow = {
  id: string;
  entry_type: EntryType;
  text_content: string | null;
  photo_url: string | null;
  audio_url: string | null;
  metadata: EntryMetadata | null;
  created_by: string;
  created_at: string;
  entry_subtype: EntrySubtype;
  is_active: boolean;
  parent_entry_id: string | null;
  superseded_at: string | null;
};

export function normalizeEntryMetadata(value: unknown): EntryMetadata {
  const metadata = (value ?? {}) as Record<string, unknown>;
  return {
    ...metadata,
    transcript_text: typeof metadata.transcript_text === "string" ? metadata.transcript_text : null,
    transcript_model: typeof metadata.transcript_model === "string" ? metadata.transcript_model : null,
    transcript_language:
      typeof metadata.transcript_language === "string" ? metadata.transcript_language : null,
    transcript_created_at:
      typeof metadata.transcript_created_at === "string" ? metadata.transcript_created_at : null,
    transcript_error:
      typeof metadata.transcript_error === "string" ? metadata.transcript_error : null
  };
}

export function mapEntryRowToResponse(row: EntryRow): EntryResponse {
  const entry_subtype = parseEntrySubtype(row.entry_subtype);

  return {
    id: row.id,
    entry_type: row.entry_type,
    text_content: row.text_content,
    photo_url: row.photo_url,
    audio_url: row.audio_url,
    metadata: row.metadata ? normalizeEntryMetadata(row.metadata) : null,
    created_by: row.created_by,
    created_at: row.created_at,
    entry_subtype,
    is_active: row.is_active,
    parent_entry_id: row.parent_entry_id,
    superseded_at: row.superseded_at
  };
}

export async function getProjectEntries(
  projectId: string,
  companyId: string
): Promise<EntryResponse[] | null> {
  const { data, error } = await supabaseAdmin
    .from("project_entries")
    .select(columnSelect)
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .or("is_active.is.null,is_active.eq.true")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[api/projects/:id/entries] Failed to fetch entries", {
      projectId,
      companyId,
      error
    });
    return null;
  }

  return (data ?? []).map(mapEntryRowToResponse);
}

export async function getEntryRowForProject(
  entryId: string,
  projectId: string,
  companyId: string
): Promise<EntryRow | null> {
  const { data, error } = await supabaseAdmin
    .from("project_entries")
    .select(columnSelect)
    .eq("id", entryId)
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/:id/entries] Failed to fetch entry", {
      entryId,
      projectId,
      companyId,
      error
    });
    return null;
  }

  return (data as EntryRow) ?? null;
}

type EntryInsert = Database["public"]["Tables"]["project_entries"]["Insert"];

export async function insertEntry(payload: EntryInsert) {
  return supabaseAdmin.from("project_entries").insert(payload).select(columnSelect).single();
}

export async function deactivateEntry(entryId: string, projectId: string, companyId: string) {
  return supabaseAdmin
    .from("project_entries")
    .update({ is_active: false, superseded_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("project_id", projectId)
    .eq("company_id", companyId);
}

export async function updateEntryMetadata(
  entryId: string,
  projectId: string,
  companyId: string,
  metadata: EntryMetadata
) {
  return supabaseAdmin
    .from("project_entries")
    .update({ metadata })
    .eq("id", entryId)
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .select(columnSelect)
    .maybeSingle();
}
