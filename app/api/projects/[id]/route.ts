import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

type ProjectResponse = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  created_at: string;
};

type EntryResponse = {
  id: string;
  entry_type: "text" | "photo" | "audio";
  text_content: string | null;
  photo_url: string | null;
  audio_url: string | null;
  created_by: string;
  created_at: string;
};

const PHOTO_BUCKET = "project-photos";
const AUDIO_BUCKET = "project-audio";

async function getCompanyIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/:id] Company lookup failed", { userId, error });
    return null;
  }

  return data?.company_id ?? null;
}

async function getProjectForCompany(
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

async function getProjectEntries(
  projectId: string,
  companyId: string
): Promise<EntryResponse[] | null> {
  const { data, error } = await supabaseAdmin
    .from("project_entries")
    .select("id, entry_type, text_content, photo_url, audio_url, created_by, created_at")
    .eq("project_id", projectId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[api/projects/:id] Failed to fetch entries", { projectId, companyId, error });
    return null;
  }

  return data ?? [];
}

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

async function deleteStorageForEntries(entries: EntryResponse[]): Promise<boolean> {
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

  const project = await getProjectForCompany(projectId, companyId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const entries = await getProjectEntries(projectId, companyId);

  if (!entries) {
    return NextResponse.json({ error: "Failed to load entries" }, { status: 500 });
  }

  return NextResponse.json({ project, entries });
}

export async function DELETE(
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

  const project = await getProjectForCompany(projectId, companyId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: entries, error: entriesError } = await supabaseAdmin
    .from("project_entries")
    .select("id, entry_type, text_content, photo_url, audio_url, created_by, created_at")
    .eq("project_id", projectId)
    .eq("company_id", companyId);

  if (entriesError || !entries) {
    console.error("[api/projects/:id] Failed to load entries for deletion", {
      projectId,
      companyId,
      entriesError
    });
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }

  const storageDeleted = await deleteStorageForEntries(entries);

  if (!storageDeleted) {
    return NextResponse.json(
      { error: "Failed to clean up project files. Please try again." },
      { status: 500 }
    );
  }

  const { error: deleteEntriesError } = await supabaseAdmin
    .from("project_entries")
    .delete()
    .eq("project_id", projectId)
    .eq("company_id", companyId);

  if (deleteEntriesError) {
    console.error("[api/projects/:id] Failed to delete entries", {
      projectId,
      companyId,
      deleteEntriesError
    });
    return NextResponse.json({ error: "Failed to delete project entries" }, { status: 500 });
  }

  const { error: deleteProjectError } = await supabaseAdmin
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("company_id", companyId);

  if (deleteProjectError) {
    console.error("[api/projects/:id] Failed to delete project", {
      projectId,
      companyId,
      deleteProjectError
    });
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
