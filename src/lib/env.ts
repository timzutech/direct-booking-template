import { siteConfig } from "../../site.config";

/** Server-side environment access. Never import this into client components. */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get stripeSecretKey() {
    return required("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return required("STRIPE_WEBHOOK_SECRET");
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY || null;
  },
  get emailFrom() {
    return process.env.EMAIL_FROM || `${siteConfig.name} <onboarding@resend.dev>`;
  },
  get hostEmail() {
    return process.env.HOST_NOTIFICATION_EMAIL || siteConfig.contact.email;
  },
  get cronSecret() {
    return process.env.CRON_SECRET || null;
  },
};

/** DEMO_MODE=true turns the site into a spec demo: no real payments. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/**
 * Online payment is switched on by adding STRIPE_SECRET_KEY. Until then every
 * home works as "request to book": guests send a request by email and nothing
 * is charged.
 */
export function paymentsEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Public base URL without a trailing slash. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/+$/, "");
}
