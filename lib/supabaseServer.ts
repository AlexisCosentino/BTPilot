import { createSupabaseClient } from "./supabaseClient";

export function createSupabaseServerClient(accessToken?: string) {
  return createSupabaseClient({ accessToken });
}
