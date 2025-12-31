import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function getOwnedCompany(userId: string) {
  return supabaseAdmin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .maybeSingle();
}

export async function createCompany(name: string, userId: string) {
  return supabaseAdmin
    .from("companies")
    .insert({
      name,
      owner_user_id: userId
    })
    .select("id")
    .single();
}
