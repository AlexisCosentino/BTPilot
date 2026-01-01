import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { generateProjectSummaries, mergeSummaryMetadata } from "../../../../../../lib/ai/summaries";
import { supabaseAdmin } from "../../../../../../lib/supabaseAdmin";
import { getCompanyIdForUser, getProjectSnapshot } from "../../entries/permissions";
import { getProjectEntries } from "../../project.service";

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

  const entries = (await getProjectEntries(projectId, companyId)) ?? [];

  const summaries =
    entries.length === 0
      ? {
          artisan_short: "Rien à résumer pour l'instant.",
          artisan_detail: "Aucune activité enregistrée.",
          client_short: "Rien à résumer pour le moment.",
          client_detail: "Aucune activité enregistrée.",
          updatedAt: new Date().toISOString()
        }
      : await generateProjectSummaries(entries);

  const { data: projectData, error: fetchError } = await supabaseAdmin
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (fetchError) {
    console.error("[api/projects/:id/summaries/generate] Failed to fetch metadata", {
      projectId,
      companyId,
      fetchError
    });
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }

  const mergedMetadata = mergeSummaryMetadata(
    (projectData?.metadata as Record<string, unknown>) ?? null,
    summaries
  );

  const { error: updateError } = await supabaseAdmin
    .from("projects")
    .update({ metadata: mergedMetadata })
    .eq("id", projectId)
    .eq("company_id", companyId);

  if (updateError) {
    console.error("[api/projects/:id/summaries/generate] Failed to update metadata", {
      projectId,
      companyId,
      updateError
    });
    return NextResponse.json({ error: "Failed to save summary" }, { status: 500 });
  }

  return NextResponse.json({
    ai_summary_artisan: mergedMetadata.ai_summary_artisan ?? null,
    ai_summary_artisan_short: mergedMetadata.ai_summary_artisan_short ?? null,
    ai_summary_artisan_detail: mergedMetadata.ai_summary_artisan_detail ?? null,
    ai_summary_client: mergedMetadata.ai_summary_client ?? null,
    ai_summary_client_short: mergedMetadata.ai_summary_client_short ?? null,
    ai_summary_client_detail: mergedMetadata.ai_summary_client_detail ?? null,
    ai_summary_updated_at: mergedMetadata.ai_summary_updated_at ?? null
  });
}
