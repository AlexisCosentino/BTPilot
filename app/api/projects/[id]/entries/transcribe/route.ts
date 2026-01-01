import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getCompanyIdForUser, getProjectSnapshot } from "../permissions";
import {
  getEntryRowForProject,
  mapEntryRowToResponse,
  normalizeEntryMetadata,
  updateEntryMetadata
} from "../entries.service";
import { transcribeEntryAudio } from "../transcription.service";

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

  const body = (await request.json().catch(() => ({}))) as { entryId?: string };
  const entryId = typeof body.entryId === "string" ? body.entryId : null;

  if (!entryId) {
    return NextResponse.json({ error: "Entry id is required" }, { status: 400 });
  }

  const entry = await getEntryRowForProject(entryId, projectId, companyId);

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  if (entry.entry_type !== "audio" || !entry.audio_url) {
    return NextResponse.json(
      { error: "Transcription available only for audio entries" },
      { status: 400 }
    );
  }

  let updatedEntry = entry;

  try {
    updatedEntry = await transcribeEntryAudio(entry, projectId, companyId);
  } catch (err) {
    console.error("[api/projects/:id/entries/transcribe] Transcription failed", err);
    const fallbackMetadata = {
      transcript_text: null,
      transcript_model: null,
      transcript_language: null,
      transcript_error: "Transcription indisponible.",
      transcript_created_at: new Date().toISOString()
    };
    const { data } = await updateEntryMetadata(entryId, projectId, companyId, {
      ...normalizeEntryMetadata(entry.metadata),
      ...fallbackMetadata
    });
    updatedEntry = (data as typeof entry) ?? { ...entry, metadata: fallbackMetadata };
  }

  return NextResponse.json({ entry: mapEntryRowToResponse(updatedEntry) });
}
