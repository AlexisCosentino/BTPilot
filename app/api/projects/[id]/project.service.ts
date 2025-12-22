import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export type ProjectResponse = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  created_at: string;
};

export type EntryResponse = {
  id: string;
  entry_type: "text" | "photo" | "audio";
  text_content: string | null;
  photo_url: string | null;
  audio_url: string | null;
  created_by: string;
  created_at: string;
  entry_subtype: "task" | "client_change" | null;
  is_active: boolean;
  parent_entry_id: string | null;
  superseded_at: string | null;
};

type EntryRow = {
  id: string;
  entry_type: "text" | "photo" | "audio";
  text_content: string | null;
  photo_url: string | null;
  audio_url: string | null;
  created_by: string;
  created_at: string;
  entry_subtype: "task" | "client_change" | null;
  is_active: boolean;
  parent_entry_id: string | null;
  superseded_at: string | null;
};

type LegacyEntryRow = {
  id: string;
  entry_type: "text" | "photo" | "audio";
  text_content: string | null;
  photo_url: string | null;
  audio_url: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
};

type LegacyEntryMetadata = {
  entry_subtype?: "task" | "client_change" | null;
  is_active?: boolean;
  parent_entry_id?: string | null;
  superseded_at?: string | null;
};

const ALLOWED_ENTRY_SUBTYPES = ["task", "client_change"];
const columnSelect =
  "id, entry_type, text_content, photo_url, audio_url, created_by, created_at, entry_subtype, is_active, parent_entry_id, superseded_at";
const legacySelect =
  "id, entry_type, text_content, photo_url, audio_url, metadata, created_by, created_at";

function parseEntrySubtype(value: unknown): "task" | "client_change" | null {
  return typeof value === "string" && ALLOWED_ENTRY_SUBTYPES.includes(value)
    ? (value as "task" | "client_change")
    : null;
}

function mapEntryRowToResponse(entry: EntryRow): EntryResponse {
  const entry_subtype = parseEntrySubtype(entry.entry_subtype);

  return {
    id: entry.id,
    entry_type: entry.entry_type,
    text_content: entry.text_content,
    photo_url: entry.photo_url,
    audio_url: entry.audio_url,
    created_by: entry.created_by,
    created_at: entry.created_at,
    entry_subtype,
    is_active: entry.is_active,
    parent_entry_id: entry.parent_entry_id,
    superseded_at: entry.superseded_at
  };
}

function mapLegacyEntryRowToResponse(entry: LegacyEntryRow): EntryResponse {
  const metadata = (entry.metadata ?? {}) as LegacyEntryMetadata;
  const entry_subtype = parseEntrySubtype(metadata.entry_subtype ?? null);
  const is_active = metadata.is_active !== false;

  return {
    id: entry.id,
    entry_type: entry.entry_type,
    text_content: entry.text_content,
    photo_url: entry.photo_url,
    audio_url: entry.audio_url,
    created_by: entry.created_by,
    created_at: entry.created_at,
    entry_subtype,
    is_active,
    parent_entry_id: metadata.parent_entry_id ?? null,
    superseded_at: metadata.superseded_at ?? null
  };
}

export async function getProjectForCompany(
  projectId: string,
  companyId: string
): Promise<ProjectResponse | null> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, name, status, description, created_at")
    .eq("id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/:id] Failed to fetch project", { projectId, companyId, error });
    return null;
  }

  return data ?? null;
}

export async function getProjectEntries(
  projectId: string,
  companyId: string
): Promise<EntryResponse[] | null> {
  const query = supabaseAdmin
    .from("project_entries")
    .select(columnSelect)
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .or("is_active.is.null,is_active.eq.true")
    .order("created_at", { ascending: true });

  const { data, error } = await query;

  if (error?.code === "42703") {
    const legacy = await supabaseAdmin
      .from("project_entries")
      .select(legacySelect)
      .eq("project_id", projectId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });

    if (legacy.error) {
      console.error("[api/projects/:id] Failed to fetch entries (legacy fallback)", {
        projectId,
        companyId,
        error: legacy.error
      });
      return null;
    }

    return (legacy.data ?? [])
      .map(mapLegacyEntryRowToResponse)
      .filter((entry) => entry.is_active);
  }

  if (error) {
    console.error("[api/projects/:id] Failed to fetch entries", { projectId, companyId, error });
    return null;
  }

  return (data ?? []).map(mapEntryRowToResponse);
}
