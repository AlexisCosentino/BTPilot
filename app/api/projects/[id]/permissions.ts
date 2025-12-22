import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function getCompanyIdForUser(userId: string): Promise<string | null> {
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
