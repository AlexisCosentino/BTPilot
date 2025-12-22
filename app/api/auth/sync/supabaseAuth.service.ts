import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function listSupabaseUsers(page: number, perPage: number) {
  return supabaseAdmin.auth.admin.listUsers({ page, perPage });
}

export async function createSupabaseUser(email: string, userId: string) {
  return supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { clerk_user_id: userId }
  });
}
