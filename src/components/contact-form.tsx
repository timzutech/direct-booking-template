"use client";

import { useActionState } from "react";
import { sendContactMessage, type ContactState } from "@/app/actions/contact";

const initial: ContactState = { status: "idle" };

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactMessage, initial);

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-2xl border border-success/30 bg-success/5 p-6 text-ink">
        <h2 className="text-2xl font-semibold">Message received</h2>
        <p className="mt-2 text-ink-soft">{state.message}</p>
      </div>
    );
  }

  const err = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="space-y-5">
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.message}</p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="label">Name</label>
          <input id="contact-name" name="name" required autoComplete="name" defaultValue={state.values?.name}
            aria-invalid={!!err.name} aria-describedby={err.name ? "contact-name-error" : undefined} className="field" />
          {err.name && <p id="contact-name-error" className="mt-1.5 text-sm text-danger">{err.name}</p>}
        </div>
        <div>
          <label htmlFor="contact-email" className="label">Email</label>
          <input id="contact-email" name="email" type="email" required autoComplete="email" defaultValue={state.values?.email}
            aria-invalid={!!err.email} aria-describedby={err.email ? "contact-email-error" : undefined} className="field" />
          {err.email && <p id="contact-email-error" className="mt-1.5 text-sm text-danger">{err.email}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="contact-phone" className="label">Phone <span className="font-normal text-ink-soft">(optional)</span></label>
        <input id="contact-phone" name="phone" type="tel" autoComplete="tel" defaultValue={state.values?.phone} className="field" />
      </div>
      {/* Honeypot — hidden from people, tempting for bots */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="contact-message" className="label">How can we help?</label>
        <textarea id="contact-message" name="message" required rows={6} defaultValue={state.values?.message}
          aria-invalid={!!err.message} aria-describedby={err.message ? "contact-message-error" : undefined} className="field" />
        {err.message && <p id="contact-message-error" className="mt-1.5 text-sm text-danger">{err.message}</p>}
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
