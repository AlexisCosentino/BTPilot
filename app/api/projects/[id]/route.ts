import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { deleteEntries, deleteProject, deleteStorageForEntries, getEntriesForDeletion } from "./cascade.service";
import { getCompanyIdForUser } from "./permissions";
import { getProjectEntries, getProjectForCompany } from "./project.service";

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

  const { data: entries, error: entriesError } = await getEntriesForDeletion(projectId, companyId);

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

  const { error: deleteEntriesError } = await deleteEntries(projectId, companyId);

  if (deleteEntriesError) {
    console.error("[api/projects/:id] Failed to delete entries", {
      projectId,
      companyId,
      deleteEntriesError
    });
    return NextResponse.json({ error: "Failed to delete project entries" }, { status: 500 });
  }

  const { error: deleteProjectError } = await deleteProject(projectId, companyId);

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
