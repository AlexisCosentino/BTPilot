import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { extractSummaryMetadata } from "../../../../../lib/ai/summaries";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { getCompanyIdForUser, getProjectSnapshot } from "../entries/permissions";

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

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/:id/summaries] Failed to fetch metadata", { projectId, companyId, error });
    return NextResponse.json({ error: "Failed to load summaries" }, { status: 500 });
  }

  const metadata = extractSummaryMetadata((data?.metadata as Record<string, unknown>) ?? null);

  return NextResponse.json({
    ai_summary_artisan: metadata.ai_summary_artisan ?? null,
    ai_summary_artisan_short: metadata.ai_summary_artisan_short ?? null,
    ai_summary_artisan_detail: metadata.ai_summary_artisan_detail ?? null,
    ai_summary_client: metadata.ai_summary_client ?? null,
    ai_summary_client_short: metadata.ai_summary_client_short ?? null,
    ai_summary_client_detail: metadata.ai_summary_client_detail ?? null,
    ai_summary_updated_at: metadata.ai_summary_updated_at ?? null,
    ai_summary_state: metadata.ai_summary_state ?? null,
    ai_summary_dirty_at: metadata.ai_summary_dirty_at ?? null,
    ai_summary_scheduled_for: metadata.ai_summary_scheduled_for ?? null
  });
}
