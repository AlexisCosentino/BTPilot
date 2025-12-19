import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./supabaseAdmin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type CreateOptions = {
  accessToken?: string;
};

export function createSupabaseClient({ accessToken }: CreateOptions = {}): SupabaseClient<Database> {
  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: authHeaders
    }
  });
}
