import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getCompanyIdForUser } from "../permissions";
import {
  PROJECT_STATUS_VALUES,
  changeProjectStatus,
  getProjectForCompany,
  type ProjectStatus
} from "../project.service";

type StatusPayload = {
  new_status?: string;
};

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

  const project = await getProjectForCompany(projectId, companyId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as StatusPayload;
  const requestedStatus = typeof body.new_status === "string" ? body.new_status : "";
  const nextStatus = PROJECT_STATUS_VALUES.find((status) => status === requestedStatus);

  if (!nextStatus) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (project.status === nextStatus) {
    return NextResponse.json({ project });
  }

  const updatedProject = await changeProjectStatus(
    projectId,
    companyId,
    nextStatus as ProjectStatus,
    userId,
    project.status
  );

  if (!updatedProject) {
    return NextResponse.json({ error: "Failed to change status" }, { status: 500 });
  }

  return NextResponse.json({ project: updatedProject });
}
