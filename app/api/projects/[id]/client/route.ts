import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getCompanyIdForUser } from "../permissions";
import { getProjectForCompany, updateProjectClientInfo, type ProjectResponse } from "../project.service";

type ClientPayload = Partial<
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
>;

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

  const existingProject = await getProjectForCompany(projectId, companyId);

  if (!existingProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as ClientPayload;
  const hasPayload = [
    "client_first_name",
    "client_last_name",
    "client_address",
    "client_city",
    "client_postal_code",
    "client_phone",
    "client_email"
  ].some((key) => key in body);

  if (!hasPayload) {
    return NextResponse.json({ error: "No client information provided" }, { status: 400 });
  }

  const project = await updateProjectClientInfo(projectId, companyId, body);

  if (!project) {
    return NextResponse.json(
      { error: "Failed to update client information" },
      { status: 500 }
    );
  }

  return NextResponse.json({ project });
}
