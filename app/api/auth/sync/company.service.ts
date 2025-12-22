import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function getOwnedCompany(userId: string) {
  return supabaseAdmin
    .from("companies")
    .select("id")
    .eq("owner_user_id", userId)
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
