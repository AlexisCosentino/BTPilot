import { supabaseAdmin, type Database } from "../../../../lib/supabaseAdmin";

export type InviteRow = Database["public"]["Tables"]["company_invites"]["Row"];
export type InviteResponse = Omit<InviteRow, "token">;
export type CompanyMemberRow = Database["public"]["Tables"]["company_members"]["Row"];

export function stripInviteToken(invite: InviteRow): InviteResponse {
  // Avoid leaking the raw invite token to clients
  const { token: _token, ...rest } = invite;
  return rest;
}

export async function getCompanyIdForUser(
  userId: string,
  companyId?: string | null
): Promise<string | null> {
  const query = supabaseAdmin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "member"])
    .order("created_at", { ascending: true })
    .limit(1);

  if (companyId) {
    query.eq("company_id", companyId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[company/invites] Failed to resolve company for user", { userId, error });
    return null;
  }

  return data?.company_id ?? null;
}

export async function getMembershipForUser(
  userId: string,
  companyId?: string | null
): Promise<CompanyMemberRow | null> {
  const query = supabaseAdmin
    .from("company_members")
    .select("*")
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "member"])
    .order("created_at", { ascending: true })
    .limit(1);

  if (companyId) {
    query.eq("company_id", companyId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[company/invites] Failed to fetch membership for user", { userId, error });
    return null;
  }

  return (data as CompanyMemberRow | null) ?? null;
}
