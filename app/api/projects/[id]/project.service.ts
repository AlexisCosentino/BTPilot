import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { normalizeEntryMetadata, type EntryMetadata } from "./entries/entries.service";

export type ProjectResponse = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  created_at: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_address: string | null;
  client_city: string | null;
  client_postal_code: string | null;
  client_phone: string | null;
  client_email: string | null;
};

export type StatusEventResponse = {
  id: string;
  project_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string | null;
};

export type EntryResponse = {
  id: string;
  entry_type: "text" | "photo" | "audio";
  text_content: string | null;
  photo_url: string | null;
  audio_url: string | null;
  metadata: EntryMetadata | null;
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
  metadata: EntryMetadata | null;
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
  "id, entry_type, text_content, photo_url, audio_url, metadata, created_by, created_at, entry_subtype, is_active, parent_entry_id, superseded_at";
const legacySelect =
  "id, entry_type, text_content, photo_url, audio_url, metadata, created_by, created_at";
const projectSelect =
  "id, name, status, description, created_at, client_first_name, client_last_name, client_address, client_city, client_postal_code, client_phone, client_email";
const statusEventSelect =
  "id, project_id, old_status, new_status, changed_at, changed_by";
export const PROJECT_STATUS_VALUES = [
  "draft",
  "planned",
  "in_progress",
  "on_hold",
  "completed",
  "canceled"
] as const;
export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

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
    metadata: entry.metadata ? normalizeEntryMetadata(entry.metadata) : null,
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
    metadata: entry.metadata ? normalizeEntryMetadata(entry.metadata) : null,
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
    .select(projectSelect)
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

export async function getProjectStatusEvents(
  projectId: string
): Promise<StatusEventResponse[] | null> {
  const { data, error } = await supabaseAdmin
    .from("project_status_events")
    .select(statusEventSelect)
    .eq("project_id", projectId)
    .order("changed_at", { ascending: true });

  if (error) {
    console.error("[api/projects/:id] Failed to fetch status events", { projectId, error });
    return null;
  }

  return data ?? [];
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function updateProjectClientInfo(
  projectId: string,
  companyId: string,
  payload: Partial<
    Pick<
      ProjectResponse,
      | "client_first_name"
      | "client_last_name"
      | "client_address"
      | "client_city"
      | "client_postal_code"
      | "client_phone"
      | "client_email"
    >
  >
): Promise<ProjectResponse | null> {
  const updates: Partial<
    Pick<
      ProjectResponse,
      | "client_first_name"
      | "client_last_name"
      | "client_address"
      | "client_city"
      | "client_postal_code"
      | "client_phone"
      | "client_email"
    >
  > = {};

  if ("client_first_name" in payload) {
    updates.client_first_name = normalizeNullableText(payload.client_first_name ?? null);
  }
  if ("client_last_name" in payload) {
    updates.client_last_name = normalizeNullableText(payload.client_last_name ?? null);
  }
  if ("client_address" in payload) {
    updates.client_address = normalizeNullableText(payload.client_address ?? null);
  }
  if ("client_city" in payload) {
    updates.client_city = normalizeNullableText(payload.client_city ?? null);
  }
  if ("client_postal_code" in payload) {
    updates.client_postal_code = normalizeNullableText(payload.client_postal_code ?? null);
  }
  if ("client_phone" in payload) {
    updates.client_phone = normalizeNullableText(payload.client_phone ?? null);
  }
  if ("client_email" in payload) {
    updates.client_email = normalizeNullableText(payload.client_email ?? null);
  }

  if (!Object.keys(updates).length) {
    return getProjectForCompany(projectId, companyId);
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .eq("company_id", companyId)
    .select(projectSelect)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/:id] Failed to update client info", {
      projectId,
      companyId,
      error
    });
    return null;
  }

  return data ?? null;
}

function isUuid(value: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function changeProjectStatus(
  projectId: string,
  companyId: string,
  newStatus: ProjectStatus,
  changedBy: string | null,
  currentStatus: string
): Promise<ProjectResponse | null> {
  const { data: project, error: updateError } = await supabaseAdmin
    .from("projects")
    .update({ status: newStatus })
    .eq("id", projectId)
    .eq("company_id", companyId)
    .select(projectSelect)
    .maybeSingle();

  if (updateError || !project) {
    console.error("[api/projects/:id/status] Failed to update status", {
      projectId,
      companyId,
      updateError
    });
    return null;
  }

  const validChangedBy = isUuid(changedBy) ? changedBy : null;
  const { error: eventError } = await supabaseAdmin.from("project_status_events").insert({
    project_id: projectId,
    old_status: currentStatus,
    new_status: newStatus,
    changed_by: validChangedBy
  });

  if (eventError) {
    console.error("[api/projects/:id/status] Failed to record status event", {
      projectId,
      companyId,
      eventError
    });
    await supabaseAdmin
      .from("projects")
      .update({ status: currentStatus })
      .eq("id", projectId)
      .eq("company_id", companyId);
    return null;
  }

  return project;
}
