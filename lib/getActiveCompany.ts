import "server-only";

import { auth } from "@clerk/nextjs/server";

import { supabaseAdmin } from "./supabaseAdmin";

export async function getActiveCompanyId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Not authenticated");
  }

  // Note: we use the service-role admin client only to resolve the tenant (company)
  // because RLS blocks anon reads without a JWT. All CRUD remains under RLS via the anon client.
  const { data, error } = await supabaseAdmin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve company: ${error.message}`);
  }

  if (!data?.company_id) {
    throw new Error("No company found for the current user");
  }

  return data.company_id;
}
