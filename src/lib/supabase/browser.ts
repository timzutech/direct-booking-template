"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Browser client for the admin dashboard (login, photo uploads). RLS applies. */
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
