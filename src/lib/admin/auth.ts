import "server-only";
import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/supabase/server";

/**
 * Returns a database client for the signed-in host, or redirects to the login
 * page. Every admin page and server action must go through this. The client
 * uses the host's own session, so Row Level Security still applies.
 */
export async function requireAdmin() {
  const db = await sessionClient();
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) redirect("/admin/login");

  const { data: isAdmin, error } = await db.rpc("is_admin");
  if (error || isAdmin !== true) redirect("/admin/login?error=not-authorised");

  return { db, user: userData.user };
}
