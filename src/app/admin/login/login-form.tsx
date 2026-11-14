"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      {state?.error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div>
        <label htmlFor="login-email" className="label">Email</label>
        <input id="login-email" name="email" type="email" required autoComplete="username" className="field" />
      </div>
      <div>
        <label htmlFor="login-password" className="label">Password</label>
        <input id="login-password" name="password" type="password" required autoComplete="current-password" className="field" />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
