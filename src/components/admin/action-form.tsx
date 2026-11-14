"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/admin/form";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

/**
 * Form wrapper for admin server actions: shows the action's success or error
 * message, and can ask for confirmation before destructive actions.
 */
export function ActionForm({
  action, children, className, confirm, resetOnSuccess = false,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !globalThis.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`mt-2 text-sm ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children, pendingText = "Saving…", variant = "primary", className = "",
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "outline" | "danger" | "link";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "btn-primary",
    outline: "btn-outline",
    danger: "btn border border-danger/40 text-danger hover:bg-danger/5",
    link: "min-h-9 text-sm font-medium text-primary underline underline-offset-4 disabled:opacity-60",
  }[variant];
  return (
    <button type="submit" disabled={pending} className={`${styles} ${className}`}>
      {pending ? pendingText : children}
    </button>
  );
}
