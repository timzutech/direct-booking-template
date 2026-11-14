"use server";

import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/supabase/server";

export type LoginState = { error: string } | null;

export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const db = await sessionClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password do not match." };

  const { data: isAdmin } = await db.rpc("is_admin");
  if (isAdmin !== true) {
    await db.auth.signOut();
    return { error: "This account does not have access to the dashboard." };
  }
  redirect("/admin");
}

export async function signOut() {
  const db = await sessionClient();
  await db.auth.signOut();
  redirect("/admin/login");
}
