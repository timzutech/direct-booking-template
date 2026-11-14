import { dayOfWeek, eachNight } from "@/lib/dates";
import type { PricingRule, Property } from "@/lib/types";

/**
 * Price calculation. Pure functions shared by the booking widget (live
 * breakdown) and the server (authoritative total) — the server never trusts
 * a total sent by the browser.
 */

export type PricingProperty = Pick<
  Property,
  | "base_price_cents"
  | "weekend_price_cents"
  | "weekend_days"
  | "cleaning_fee_cents"
  | "pets_allowed"
  | "pet_fee_cents"
  | "tax_rate_percent"
>;

export type PricingRuleInput = Pick<
  PricingRule,
  "name" | "start_date" | "end_date" | "nightly_price_cents" | "weekend_price_cents" | "min_nights" | "priority" | "created_at"
>;

export type NightPrice = { date: string; cents: number; weekend: boolean; rule: string | null };

export type PriceLine = { label: string; nights: number; unitCents: number; totalCents: number };

export type PriceBreakdown = {
  nights: NightPrice[];
  nightCount: number;
  lines: PriceLine[];        // nights grouped by rate, for display
  accommodationCents: number;
  cleaningFeeCents: number;
  petFeeCents: number;
  taxRatePercent: number;
  taxCents: number;
  totalCents: number;
};

/** The pricing rule that applies to a night, if any (highest priority, then newest). */
export function ruleForDate(rules: PricingRuleInput[], date: string): PricingRuleInput | null {
  let best: PricingRuleInput | null = null;
  for (const rule of rules) {
    if (date < rule.start_date || date > rule.end_date) continue;
    if (
      !best ||
      rule.priority > best.priority ||
      (rule.priority === best.priority && rule.created_at > best.created_at)
    ) {
      best = rule;
    }
  }
  return best;
}

export function priceForNight(property: PricingProperty, rules: PricingRuleInput[], date: string): NightPrice {
  const weekend = property.weekend_days.includes(dayOfWeek(date));
  const rule = ruleForDate(rules, date);
  let cents: number;
  if (rule) {
    cents = weekend ? (rule.weekend_price_cents ?? rule.nightly_price_cents) : rule.nightly_price_cents;
  } else {
    cents = weekend ? (property.weekend_price_cents ?? property.base_price_cents) : property.base_price_cents;
  }
  return { date, cents, weekend, rule: rule?.name ?? null };
}

export function calculatePrice(
  property: PricingProperty,
  rules: PricingRuleInput[],
  checkIn: string,
  checkOut: string,
  options: { pets?: boolean } = {},
): PriceBreakdown {
  const nights = eachNight(checkIn, checkOut).map((date) => priceForNight(property, rules, date));

  const groups = new Map<string, PriceLine>();
  for (const night of nights) {
    const label = night.rule ? `${night.rule}${night.weekend ? " weekend" : ""}` : night.weekend ? "Weekend" : "";
    const key = `${night.cents}|${label}`;
    const line = groups.get(key) ?? { label, nights: 0, unitCents: night.cents, totalCents: 0 };
    line.nights += 1;
    line.totalCents += night.cents;
    groups.set(key, line);
  }

  const accommodationCents = nights.reduce((sum, n) => sum + n.cents, 0);
  const cleaningFeeCents = nights.length > 0 ? property.cleaning_fee_cents : 0;
  const petFeeCents = options.pets && property.pets_allowed && nights.length > 0 ? property.pet_fee_cents : 0;
  const taxRatePercent = Number(property.tax_rate_percent) || 0;
  const taxCents = Math.round(((accommodationCents + cleaningFeeCents + petFeeCents) * taxRatePercent) / 100);

  return {
    nights,
    nightCount: nights.length,
    lines: [...groups.values()],
    accommodationCents,
    cleaningFeeCents,
    petFeeCents,
    taxRatePercent,
    taxCents,
    totalCents: accommodationCents + cleaningFeeCents + petFeeCents + taxCents,
  };
}

/** Lowest nightly rate a guest could pay — used for "From $X / night". */
export function startingPrice(property: Pick<Property, "base_price_cents" | "weekend_price_cents">): number {
  return Math.min(property.base_price_cents, property.weekend_price_cents ?? property.base_price_cents);
}

/** Minimum stay for a given check-in date (a pricing rule can raise it). */
export function minNightsFor(
  property: Pick<Property, "min_nights">,
  rules: PricingRuleInput[],
  checkIn: string,
): number {
  const rule = ruleForDate(rules, checkIn);
  return Math.max(property.min_nights, rule?.min_nights ?? 1);
}
