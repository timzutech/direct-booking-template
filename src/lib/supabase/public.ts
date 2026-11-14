import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Anonymous client for reading published content on the server.
 * Uses the public key, so Row Level Security applies: only published rows are visible.
 */
export function publicClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
