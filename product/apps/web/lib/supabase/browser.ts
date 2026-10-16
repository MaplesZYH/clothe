import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseEnv } from "@outfit/config";

export function createSupabaseBrowserClient(): SupabaseClient {
  const env = requireSupabaseEnv();
  return createBrowserClient(env.url, env.anonKey);
}
