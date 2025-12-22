import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { Buffer } from "buffer";

import { supabaseAdmin, type Database } from "../../../../../lib/supabaseAdmin";

type EntryType = Database["public"]["Enums"]["project_entry_type"];
type EntrySubtype = "task" | "client_change" | null;

type EntryResponse = {
  id: string;
  entry_type: EntryType;
  text_content: string | null;
  photo_url: string | null;
  audio_url: string | null;
  created_by: string;
  created_at: string;
  entry_subtype: EntrySubtype;
  is_active: boolean;
  parent_entry_id: string | null;
  superseded_at: string | null;
};

type EntryRow = {
  id: string;
  entry_type: EntryType;
  text_content: string | null;
  photo_url: string | null;
  audio_url: string | null;
  created_by: string;
  created_at: string;
  entry_subtype: EntrySubtype;
  is_active: boolean;
  parent_entry_id: string | null;
  superseded_at: string | null;
};

const PHOTO_SIZE_LIMIT_BYTES = 1_000_000;
const AUDIO_SIZE_LIMIT_BYTES = 3_000_000;
const PHOTO_BUCKET = "project-photos";
const AUDIO_BUCKET = "project-audio";
const ALLOWED_ENTRY_SUBTYPES: EntrySubtype[] = ["task", "client_change"];
const columnSelect =
  "id, entry_type, text_content, photo_url, audio_url, created_by, created_at, entry_subtype, is_active, parent_entry_id, superseded_at";

function parseEntrySubtype(value: FormDataEntryValue | string | null): EntrySubtype {
  if (typeof value !== "string") return null;
  return ALLOWED_ENTRY_SUBTYPES.includes(value as EntrySubtype) ? (value as EntrySubtype) : null;
}

function mapEntryRowToResponse(row: EntryRow): EntryResponse {
  const entry_subtype = parseEntrySubtype(row.entry_subtype) ?? null;

  return {
    id: row.id,
    entry_type: row.entry_type,
    text_content: row.text_content,
    photo_url: row.photo_url,
    audio_url: row.audio_url,
    created_by: row.created_by,
    created_at: row.created_at,
    entry_subtype,
    is_active: row.is_active,
    parent_entry_id: row.parent_entry_id,
    superseded_at: row.superseded_at
  };
}

function sanitizeExtension(mime: string | null): string {
  if (!mime) return "bin";
  const candidate = mime.split("/")[1] ?? "bin";
  const safe = candidate.replace(/[^a-zA-Z0-9]/g, "");
  return safe || "bin";
}

async function ensureBucketExists(bucket: string): Promise<boolean> {
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

async function getCompanyIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/:id/entries] Company lookup failed", { userId, error });
    return null;
  }

  return data?.company_id ?? null;
}

type ProjectSnapshot = { id: string; status: string };

async function getProjectSnapshot(
  projectId: string,
  companyId: string
): Promise<ProjectSnapshot | null> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, status")
    .eq("id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/:id/entries] Project lookup failed", {
      projectId,
      companyId,
      error
    });
    return null;
  }

  return data ?? null;
}

async function getProjectEntries(
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

async function getEntryRowForProject(
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

async function uploadFileToStorage(
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCompanyIdForUser(userId);

  if (!companyId) {
    return NextResponse.json(
      { error: "No company found for the current user" },
      { status: 400 }
    );
  }

  const projectSnapshot = await getProjectSnapshot(projectId, companyId);

  if (!projectSnapshot) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const entries = await getProjectEntries(projectId, companyId);

  if (!entries) {
    return NextResponse.json({ error: "Failed to load entries" }, { status: 500 });
  }

  return NextResponse.json({ entries });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCompanyIdForUser(userId);

  if (!companyId) {
    return NextResponse.json(
      { error: "No company found for the current user" },
      { status: 400 }
    );
  }

  const projectSnapshot = await getProjectSnapshot(projectId, companyId);

  if (!projectSnapshot) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const contentTypeHeader = request.headers.get("content-type") ?? "";
  let entryType: EntryType | null = null;
  let textContent: string | null = null;
  let file: File | null = null;
  let entrySubtype: EntrySubtype = null;

  if (contentTypeHeader.startsWith("multipart/form-data")) {
    const formData = await request.formData();
    const typeValue = formData.get("type");
    entryType =
      typeValue === "image"
        ? "photo"
        : typeof typeValue === "string"
          ? (typeValue as EntryType)
          : null;

    const fileValue = formData.get("file");
    if (fileValue instanceof File) {
      file = fileValue;
    }

    if (entryType === "text") {
      const contentValue = formData.get("content");
      textContent = typeof contentValue === "string" ? contentValue.trim() : "";
    }

    entrySubtype = parseEntrySubtype(formData.get("entry_subtype"));
  } else {
    const body = (await request.json().catch(() => ({}))) as {
      type?: EntryType | "image";
      content?: string | null;
      entry_subtype?: EntrySubtype;
    };
    const normalizedType = body.type === "image" ? "photo" : body.type;
    entryType = normalizedType && ["text", "photo", "audio"].includes(normalizedType)
      ? (normalizedType as EntryType)
      : null;
    textContent = typeof body.content === "string" ? body.content.trim() : "";
    entrySubtype = parseEntrySubtype(body.entry_subtype ?? null);
  }

  const allowedTypes: EntryType[] = ["text", "photo", "audio"];

  if (!entryType || !allowedTypes.includes(entryType)) {
    return NextResponse.json({ error: "Invalid entry type" }, { status: 400 });
  }

  if (entryType === "text" && !textContent) {
    return NextResponse.json({ error: "Text content is required" }, { status: 400 });
  }

  if ((entryType === "photo" || entryType === "audio") && !file) {
    return NextResponse.json(
      { error: "A file upload is required for this entry type" },
      { status: 400 }
    );
  }

  if (entryType === "photo" || entryType === "audio") {
    const sizeLimit = entryType === "photo" ? PHOTO_SIZE_LIMIT_BYTES : AUDIO_SIZE_LIMIT_BYTES;
    if (file && file.size > sizeLimit) {
      return NextResponse.json(
        {
          error:
            entryType === "photo"
              ? "Image is too large. Max size is 1 MB."
              : "Audio is too large. Max size is 3 MB."
        },
        { status: 413 }
      );
    }
  }

  let photoUrl: string | null = null;
  let audioUrl: string | null = null;

  if (entryType === "photo" || entryType === "audio") {
    const bucket = entryType === "photo" ? PHOTO_BUCKET : AUDIO_BUCKET;
    const bucketReady = await ensureBucketExists(bucket);

    if (!bucketReady || !file) {
      return NextResponse.json(
        { error: "File storage is unavailable. Please try again later." },
        { status: 500 }
      );
    }

    const extension = sanitizeExtension(file.type || null);
    const uniqueId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    const path = `${companyId}/${projectId}/${Date.now()}-${uniqueId}.${extension}`;
    const publicUrl = await uploadFileToStorage(bucket, path, file);

    if (!publicUrl) {
      return NextResponse.json(
        { error: "Failed to upload file. Please try again." },
        { status: 500 }
      );
    }

    if (entryType === "photo") {
      photoUrl = publicUrl;
    } else {
      audioUrl = publicUrl;
    }
  }

  const payload = {
    project_id: projectId,
    company_id: companyId,
    entry_type: entryType,
    text_content: entryType === "text" ? textContent : null,
    photo_url: photoUrl,
    audio_url: audioUrl,
    created_by: userId,
    entry_subtype: entrySubtype,
    is_active: true,
    parent_entry_id: null,
    superseded_at: null
  };

  const { data, error } = await supabaseAdmin
    .from("project_entries")
    .insert(payload)
    .select(columnSelect)
    .single();

  if (error || !data) {
    console.error("[api/projects/:id/entries] Failed to create entry", { projectId, error });
    return NextResponse.json(
      { error: "Could not create entry. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ entry: mapEntryRowToResponse(data as EntryRow) }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCompanyIdForUser(userId);

  if (!companyId) {
    return NextResponse.json(
      { error: "No company found for the current user" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { entryId?: string };
  const entryId = typeof body.entryId === "string" ? body.entryId : null;

  if (!entryId) {
    return NextResponse.json({ error: "Entry id is required" }, { status: 400 });
  }

  const entry = await getEntryRowForProject(entryId, projectId, companyId);

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("project_entries")
    .update({ is_active: false, superseded_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("project_id", projectId)
    .eq("company_id", companyId);

  if (updateError) {
    console.error("[api/projects/:id/entries] Failed to deactivate entry", {
      entryId,
      projectId,
      companyId,
      updateError
    });
    return NextResponse.json({ error: "Could not delete entry" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCompanyIdForUser(userId);

  if (!companyId) {
    return NextResponse.json(
      { error: "No company found for the current user" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    entryId?: string;
    text?: string | null;
  };

  const entryId = typeof body.entryId === "string" ? body.entryId : null;
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!entryId) {
    return NextResponse.json({ error: "Entry id is required" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Text content cannot be empty" }, { status: 400 });
  }

  const entry = await getEntryRowForProject(entryId, projectId, companyId);

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const entrySubtype = parseEntrySubtype(entry.entry_subtype) ?? null;

  if (entry.is_active === false) {
    return NextResponse.json({ error: "Entry is no longer active" }, { status: 400 });
  }

  if (entry.entry_type !== "text") {
    return NextResponse.json({ error: "Only text entries can be edited" }, { status: 400 });
  }

  const projectSnapshot = await getProjectSnapshot(projectId, companyId);

  if (!projectSnapshot) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const newEntryInsert = {
    project_id: projectId,
    company_id: companyId,
    entry_type: entry.entry_type,
    text_content: text,
    photo_url: null,
    audio_url: null,
    created_by: userId,
    entry_subtype: entrySubtype,
    is_active: true,
    parent_entry_id: entryId,
    superseded_at: null
  };

  const { data: newEntry, error: createError } = await supabaseAdmin
    .from("project_entries")
    .insert(newEntryInsert)
    .select(columnSelect)
    .single();

  if (createError || !newEntry) {
    console.error("[api/projects/:id/entries] Failed to create entry version", {
      entryId,
      projectId,
      companyId,
      createError
    });
    return NextResponse.json({ error: "Could not update entry" }, { status: 500 });
  }

  const { error: deactivateError } = await supabaseAdmin
    .from("project_entries")
    .update({ is_active: false, superseded_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("project_id", projectId)
    .eq("company_id", companyId);

  if (deactivateError) {
    console.error("[api/projects/:id/entries] Failed to deactivate previous entry", {
      entryId,
      projectId,
      companyId,
      deactivateError
    });
    return NextResponse.json({ error: "Could not update entry" }, { status: 500 });
  }

  return NextResponse.json({ entry: mapEntryRowToResponse(newEntry as EntryRow) });
}
