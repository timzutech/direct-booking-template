"use server";

import { z } from "zod";
import { siteConfig } from "../../../site.config";
import { emailLayout, emailParagraph, emailRows, sendEmail } from "@/lib/email/send";
import { env, isDemoMode } from "@/lib/env";

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "message", string>>;
  values?: { name: string; email: string; phone: string; message: string };
};

const schema = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(120),
  email: z.email("Please enter a valid email address.").max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10, "Please write a short message (at least 10 characters).").max(4000),
});

export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  // Honeypot: real visitors never fill this hidden field.
  if (String(formData.get("company") ?? "").trim() !== "") {
    return { status: "success", message: "Thank you — your message has been sent." };
  }

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: ContactState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as "name" | "email" | "message";
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors, values };
  }

  if (isDemoMode()) {
    return { status: "success", message: "This is a preview site, so your message was not sent — but this is what guests will see." };
  }

  const { name, email, phone, message } = parsed.data;
  const result = await sendEmail({
    to: env.hostEmail,
    replyTo: email,
    subject: `New message from ${name}`,
    html: emailLayout(
      "New contact form message",
      emailRows([["Name", name], ["Email", email], ["Phone", phone]]) + emailParagraph(message).replace(/\n/g, "<br>"),
    ),
  });

  if (!result.sent) {
    return {
      status: "error",
      message: `Sorry, we could not send your message. Please email us directly at ${siteConfig.contact.email}.`,
      values,
    };
  }
  return { status: "success", message: "Thank you — your message has been sent. We will reply as soon as we can." };
}
