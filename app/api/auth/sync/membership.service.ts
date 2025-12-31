import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function getExistingMembership(userId: string, companyId?: string | null) {
  const query = supabaseAdmin
    .from("company_members")
    .select("company_id, role, supabase_user_id")
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "member"])
    .order("created_at", { ascending: true });

  if (companyId) {
    query.eq("company_id", companyId);
  }

  return query;
}

export async function upsertMembership(params: {
  companyId: string;
  userId: string;
  supabaseUserId: string;
  role: string;
}) {
  const { companyId, userId, supabaseUserId, role } = params;
  return supabaseAdmin
    .from("company_members")
    .upsert(
      {
        company_id: companyId,
        user_id: userId,
        supabase_user_id: supabaseUserId,
        role
      },
      { onConflict: "company_id,user_id" }
    );
}
