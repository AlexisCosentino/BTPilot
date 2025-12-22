import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import type { EntrySubtype } from "./validation";

export type ProjectSnapshot = { id: string; status: string };

export async function getCompanyIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/:id/entries] Company lookup failed", { userId, error });
    return null;
  }

  return data?.company_id ?? null;
}

export async function getProjectSnapshot(
  projectId: string,
  companyId: string
): Promise<ProjectSnapshot | null> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, status")
    .eq("id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/:id/entries] Project lookup failed", {
      projectId,
      companyId,
      error
    });
    return null;
  }

  return data ?? null;
}
