import { describe, expect, it } from "vitest";
import { calculatePrice, minNightsFor, priceForNight, startingPrice, type PricingProperty, type PricingRuleInput } from "@/lib/pricing";

const property: PricingProperty = {
  base_price_cents: 20000,
  weekend_price_cents: 25000,
  weekend_days: [5, 6], // Friday + Saturday nights
  cleaning_fee_cents: 10000,
  pets_allowed: true,
  pet_fee_cents: 5000,
  tax_rate_percent: 10,
};

const rule = (over: Partial<PricingRuleInput>): PricingRuleInput => ({
  name: "Summer",
  start_date: "2026-07-01",
  end_date: "2026-07-31",
  nightly_price_cents: 30000,
  weekend_price_cents: null,
  min_nights: null,
  priority: 0,
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("calculatePrice", () => {
  it("charges nightly rate x nights plus cleaning and tax", () => {
    // Mon 2 Mar → Thu 5 Mar 2026: 3 weekday nights
    const p = calculatePrice(property, [], "2026-03-02", "2026-03-05");
    expect(p.nightCount).toBe(3);
    expect(p.accommodationCents).toBe(60000);
    expect(p.cleaningFeeCents).toBe(10000);
    expect(p.petFeeCents).toBe(0);
    expect(p.taxCents).toBe(7000);
    expect(p.totalCents).toBe(77000);
    expect(p.lines).toEqual([{ label: "", nights: 3, unitCents: 20000, totalCents: 60000 }]);
  });

  it("applies the weekend rate to Friday and Saturday nights only", () => {
    // Thu 5 Mar → Mon 9 Mar 2026: Thu, Fri*, Sat*, Sun
    const p = calculatePrice(property, [], "2026-03-05", "2026-03-09");
    expect(p.nights.map((n) => n.cents)).toEqual([20000, 25000, 25000, 20000]);
    expect(p.accommodationCents).toBe(90000);
    expect(p.lines).toHaveLength(2);
  });

  it("uses the base rate on weekends when no weekend rate is set", () => {
    const p = calculatePrice({ ...property, weekend_price_cents: null }, [], "2026-03-06", "2026-03-08");
    expect(p.accommodationCents).toBe(40000);
  });

  it("adds the pet fee only when pets are coming and allowed", () => {
    expect(calculatePrice(property, [], "2026-03-02", "2026-03-04", { pets: true }).petFeeCents).toBe(5000);
    expect(calculatePrice({ ...property, pets_allowed: false }, [], "2026-03-02", "2026-03-04", { pets: true }).petFeeCents).toBe(0);
  });

  it("taxes accommodation, cleaning and pet fee, rounded to the cent", () => {
    const p = calculatePrice({ ...property, tax_rate_percent: 8.25, base_price_cents: 19999 }, [], "2026-03-02", "2026-03-03", { pets: true });
    // (19999 + 10000 + 5000) * 8.25% = 2887.4175 → 2887
    expect(p.taxCents).toBe(2887);
    expect(p.totalCents).toBe(19999 + 10000 + 5000 + 2887);
  });

  it("charges no tax when the rate is zero", () => {
    expect(calculatePrice({ ...property, tax_rate_percent: 0 }, [], "2026-03-02", "2026-03-04").taxCents).toBe(0);
  });

  it("uses a seasonal rule for nights inside it, including its end date", () => {
    // 30 Jun (base, Tue) → 2 Jul: 30 Jun base, 1 Jul rule
    const p = calculatePrice(property, [rule({})], "2026-06-30", "2026-07-02");
    expect(p.nights.map((n) => [n.cents, n.rule])).toEqual([[20000, null], [30000, "Summer"]]);
    expect(priceForNight(property, [rule({})], "2026-07-31").cents).toBe(30000);
    expect(priceForNight(property, [rule({})], "2026-08-01").rule).toBeNull();
  });

  it("seasonal weekend rate falls back to the seasonal nightly rate", () => {
    expect(priceForNight(property, [rule({})], "2026-07-03").cents).toBe(30000); // Friday in July
    expect(priceForNight(property, [rule({ weekend_price_cents: 36000 })], "2026-07-03").cents).toBe(36000);
  });

  it("picks the highest-priority rule when rules overlap", () => {
    const rules = [rule({}), rule({ name: "Holiday", start_date: "2026-07-03", end_date: "2026-07-05", nightly_price_cents: 45000, priority: 10 })];
    expect(priceForNight(property, rules, "2026-07-04").cents).toBe(45000);
    expect(priceForNight(property, rules, "2026-07-06").cents).toBe(30000);
  });

  it("returns zero for an empty stay", () => {
    expect(calculatePrice(property, [], "2026-03-02", "2026-03-02").totalCents).toBe(0);
  });
});

describe("helpers", () => {
  it("startingPrice is the lowest of base and weekend", () => {
    expect(startingPrice({ base_price_cents: 20000, weekend_price_cents: 25000 })).toBe(20000);
    expect(startingPrice({ base_price_cents: 20000, weekend_price_cents: 15000 })).toBe(15000);
    expect(startingPrice({ base_price_cents: 20000, weekend_price_cents: null })).toBe(20000);
  });

  it("a pricing rule can raise the minimum stay", () => {
    expect(minNightsFor({ min_nights: 2 }, [rule({ min_nights: 5 })], "2026-07-10")).toBe(5);
    expect(minNightsFor({ min_nights: 2 }, [rule({ min_nights: 5 })], "2026-06-10")).toBe(2);
    expect(minNightsFor({ min_nights: 3 }, [rule({ min_nights: 1 })], "2026-07-10")).toBe(3);
  });
});
