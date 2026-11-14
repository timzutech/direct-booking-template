import "server-only";
import { Resend } from "resend";
import { siteConfig } from "../../../site.config";
import { env } from "@/lib/env";

export type SendResult = { sent: true } | { sent: false; reason: string };

/**
 * Sends one transactional email through Resend. Never throws: callers decide
 * whether a failed email matters (a booking must not fail because of one).
 */
export async function sendEmail(message: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<SendResult> {
  const apiKey = env.resendApiKey;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY is not set — skipped "${message.subject}" to ${message.to}`);
    return { sent: false, reason: "Email is not configured (RESEND_API_KEY missing)." };
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: env.emailFrom,
      to: message.to,
      subject: message.subject,
      html: message.html,
      replyTo: message.replyTo,
    });
    if (error) {
      console.error(`[email] Resend rejected "${message.subject}": ${error.message}`);
      return { sent: false, reason: error.message };
    }
    return { sent: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown error";
    console.error(`[email] Failed to send "${message.subject}": ${reason}`);
    return { sent: false, reason };
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Branded HTML shell shared by every email. `body` must already be safe HTML. */
export function emailLayout(heading: string, body: string): string {
  const c = siteConfig.colors;
  return `<!doctype html><html><body style="margin:0;background:${c.background};font-family:Helvetica,Arial,sans-serif;color:${c.ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.background};padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${c.surface};border:1px solid ${c.border};border-radius:14px;overflow:hidden;">
<tr><td style="background:${c.primary};color:${c.primaryForeground};padding:20px 28px;font-size:18px;font-weight:bold;">${escapeHtml(siteConfig.name)}</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${c.ink};">${escapeHtml(heading)}</h1>
${body}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid ${c.border};font-size:12px;color:${c.inkSoft};">
${escapeHtml(siteConfig.name)} · <a href="mailto:${escapeHtml(siteConfig.contact.email)}" style="color:${c.inkSoft};">${escapeHtml(siteConfig.contact.email)}</a>${siteConfig.contact.phone ? ` · ${escapeHtml(siteConfig.contact.phone)}` : ""}
</td></tr></table></td></tr></table></body></html>`;
}

/** Simple two-column details table for emails. Values are escaped here. */
export function emailRows(rows: [string, string | null | undefined][]): string {
  const c = siteConfig.colors;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;">${rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid ${c.border};color:${c.inkSoft};width:42%;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:7px 0;border-bottom:1px solid ${c.border};text-align:right;vertical-align:top;">${escapeHtml(value!).replace(/\n/g, "<br>")}</td></tr>`,
    )
    .join("")}</table>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${escapeHtml(text)}</p>`;
}
