import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceEnv } from "@/lib/env";
import type { Database } from "@/lib/types";

export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseServiceEnv();

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
