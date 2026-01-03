import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { generateProjectSummariesForProject } from "../summaryScheduler";
import { getCompanyIdForUser, getProjectSnapshot } from "../../entries/permissions";

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

  const result = await generateProjectSummariesForProject({
    projectId,
    companyId,
    mode: "manual"
  });

  if (result.status === "blocked") {
    return NextResponse.json(
      { error: "Synthese en attente (pas assez d'entrees)." },
      { status: 400 }
    );
  }

  if (result.status === "skipped") {
    if (result.reason === "already_generating") {
      return NextResponse.json({ error: "Generation deja en cours." }, { status: 409 });
    }
    return NextResponse.json({ error: "Generation impossible." }, { status: 500 });
  }

  const mergedMetadata = result.metadata;

  return NextResponse.json({
    ai_summary_artisan: mergedMetadata.ai_summary_artisan ?? null,
    ai_summary_artisan_short: mergedMetadata.ai_summary_artisan_short ?? null,
    ai_summary_artisan_detail: mergedMetadata.ai_summary_artisan_detail ?? null,
    ai_summary_client: mergedMetadata.ai_summary_client ?? null,
    ai_summary_client_short: mergedMetadata.ai_summary_client_short ?? null,
    ai_summary_client_detail: mergedMetadata.ai_summary_client_detail ?? null,
    ai_summary_updated_at: mergedMetadata.ai_summary_updated_at ?? null,
    ai_summary_state: mergedMetadata.ai_summary_state ?? null,
    ai_summary_dirty_at: mergedMetadata.ai_summary_dirty_at ?? null,
    ai_summary_scheduled_for: mergedMetadata.ai_summary_scheduled_for ?? null
  });
}
