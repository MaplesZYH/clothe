import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseEnv } from "@outfit/config";

export function createSupabaseAdminClient(): SupabaseClient {
  const env = requireSupabaseEnv();
  if (!env.serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-only admin operations.");
  }
  return createClient(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
