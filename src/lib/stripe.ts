import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

/**
 * Stripe client using the CLIENT'S own secret key (STRIPE_SECRET_KEY).
 * STRIPE_API_BASE_URL is optional and only for automated tests against a
 * local Stripe mock (e.g. http://localhost:12111) — never set it in production.
 */
export function getStripe(): Stripe {
  if (client) return client;
  const base = process.env.STRIPE_API_BASE_URL;
  if (base) {
    const url = new URL(base);
    client = new Stripe(env.stripeSecretKey, {
      host: url.hostname,
      port: Number(url.port) || (url.protocol === "https:" ? 443 : 80),
      protocol: url.protocol === "https:" ? "https" : "http",
      maxNetworkRetries: 0,
    });
  } else {
    client = new Stripe(env.stripeSecretKey);
  }
  return client;
}
