import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { checkMembership } from "../permissions";
import {
  PROJECT_STATUS_VALUES,
  getProjectForCompany,
  getProjectWithMetadataForCompany,
  type ProjectStatus
} from "../project.service";

const ARCHIVED_STATUS = "archived";
const ARCHIVED_STATUS_KEY = "archived_status";
const DEFAULT_RESTORE_STATUS: ProjectStatus = "draft";

function normalizeProjectMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function resolveRestoreStatus(value: unknown): ProjectStatus {
  if (typeof value !== "string") {
    return DEFAULT_RESTORE_STATUS;
  }

  const match = PROJECT_STATUS_VALUES.find((status) => status === value);
  return match ?? DEFAULT_RESTORE_STATUS;
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

  const url = new URL(request.url);
  const companyId = url.searchParams.get("company_id");

  if (!companyId) {
    return NextResponse.json(
      { error: "company_id is required" },
      { status: 400 }
    );
  }

  const membership = await checkMembership(userId, companyId);
  if (!membership.ok) {
    if (membership.errorType === "network") {
      return NextResponse.json(
        { error: "Temporary service error, please retry" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await getProjectWithMetadataForCompany(projectId, companyId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.status !== ARCHIVED_STATUS) {
    const currentProject = await getProjectForCompany(projectId, companyId);
    return NextResponse.json({ project: currentProject ?? project });
  }

  const metadata = normalizeProjectMetadata(project.metadata);
  const previousStatus = resolveRestoreStatus(metadata[ARCHIVED_STATUS_KEY]);
  const { [ARCHIVED_STATUS_KEY]: _ignored, ...restMetadata } = metadata;
  const nextMetadata = Object.keys(restMetadata).length ? restMetadata : null;

  const { error } = await supabaseAdmin
    .from("projects")
    .update({ status: previousStatus, metadata: nextMetadata })
    .eq("id", projectId)
    .eq("company_id", companyId);

  if (error) {
    console.error("[api/projects/:id/restore] Failed to restore project", {
      projectId,
      companyId,
      error
    });
    return NextResponse.json({ error: "Failed to restore project" }, { status: 500 });
  }

  const updatedProject = await getProjectForCompany(projectId, companyId);

  if (!updatedProject) {
    return NextResponse.json({ error: "Failed to restore project" }, { status: 500 });
  }

  return NextResponse.json({ project: updatedProject });
}
