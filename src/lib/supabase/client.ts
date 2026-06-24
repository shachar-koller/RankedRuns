"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/types";

export function createClient(): SupabaseClient<any> {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey) as unknown as SupabaseClient<any>;
}
