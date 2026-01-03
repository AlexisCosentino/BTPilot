import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  AUDIO_SIZE_LIMIT_BYTES,
  ALLOWED_ENTRY_TYPES,
  EntrySubtype,
  EntryType,
  PHOTO_SIZE_LIMIT_BYTES,
  parseEntrySubtype,
  sanitizeExtension
} from "./validation";
import { getCompanyIdForUser, getProjectSnapshot } from "./permissions";
import {
  deactivateEntry,
  getEntryRowForProject,
  getProjectEntries,
  insertEntry,
  mapEntryRowToResponse,
  type EntryRow
} from "./entries.service";
import { AUDIO_BUCKET, ensureBucketExists, PHOTO_BUCKET, uploadFileToStorage } from "./storage.service";
import { transcribeEntryAudio } from "./transcription.service";
import { scheduleSummaryGeneration } from "../summaries/summaryScheduler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { userId } = getAuth(request);

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { userId } = getAuth(request);

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

  if (!entryType || !ALLOWED_ENTRY_TYPES.includes(entryType)) {
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

  const { data, error } = await insertEntry(payload);

  if (error || !data) {
    console.error("[api/projects/:id/entries] Failed to create entry", { projectId, error });
    return NextResponse.json(
      { error: "Could not create entry. Please try again." },
      { status: 500 }
    );
  }

  let entryRow = data as EntryRow;

  if (entryType === "audio" && entryRow.audio_url) {
    try {
      entryRow = await transcribeEntryAudio(entryRow, projectId, companyId);
    } catch (err) {
      console.error("[api/projects/:id/entries] Transcription failed", err);
    }
  }

  if (entryType === "text" || entryType === "audio") {
    void scheduleSummaryGeneration({ projectId, companyId, entryType }).catch((err) => {
      console.error("[api/projects/:id/entries] Failed to schedule summary update", {
        projectId,
        companyId,
        err
      });
    });
  }

  return NextResponse.json({ entry: mapEntryRowToResponse(entryRow) }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { userId } = getAuth(request);

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

  const { error: updateError } = await deactivateEntry(entryId, projectId, companyId);

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { userId } = getAuth(request);

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
    entry_subtype?: EntrySubtype;
  };

  const entryId = typeof body.entryId === "string" ? body.entryId : null;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const nextSubtype = parseEntrySubtype(body.entry_subtype ?? null);

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

  const entrySubtype = nextSubtype ?? parseEntrySubtype(entry.entry_subtype) ?? null;

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

  const { data: newEntry, error: createError } = await insertEntry(newEntryInsert);

  if (createError || !newEntry) {
    console.error("[api/projects/:id/entries] Failed to create entry version", {
      entryId,
      projectId,
      companyId,
      createError
    });
    return NextResponse.json({ error: "Could not update entry" }, { status: 500 });
  }

  const { error: deactivateError } = await deactivateEntry(entryId, projectId, companyId);

  if (deactivateError) {
    console.error("[api/projects/:id/entries] Failed to deactivate previous entry", {
      entryId,
      projectId,
      companyId,
      deactivateError
    });
    return NextResponse.json({ error: "Could not update entry" }, { status: 500 });
  }

  void scheduleSummaryGeneration({ projectId, companyId, entryType: entry.entry_type }).catch(
    (err) => {
      console.error("[api/projects/:id/entries] Failed to schedule summary update", {
        projectId,
        companyId,
        err
      });
    }
  );

  return NextResponse.json({ entry: mapEntryRowToResponse(newEntry as EntryRow) });
}
