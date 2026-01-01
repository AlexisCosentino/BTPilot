import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { checkMembership } from "./permissions";
import {
  getProjectEntries,
  getProjectForCompany,
  getProjectStatusEvents
} from "./project.service";

export async function GET(
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

  const project = await getProjectForCompany(projectId, companyId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const entries = await getProjectEntries(projectId, companyId);

  if (!entries) {
    return NextResponse.json({ error: "Failed to load entries" }, { status: 500 });
  }

  const statusEvents = await getProjectStatusEvents(projectId);

  if (!statusEvents) {
    return NextResponse.json({ error: "Failed to load status history" }, { status: 500 });
  }

  return NextResponse.json({ project, entries, status_events: statusEvents });
}

