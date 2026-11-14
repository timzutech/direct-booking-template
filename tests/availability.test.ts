import { describe, expect, it } from "vitest";
import { bookingWindow, isNightUnavailable, rangeOverlaps, validateStay, type StayRules } from "@/lib/availability";
import { addDays, addMonths, daysInMonth, diffDays, eachNight, isIsoDate, todayInTimezone } from "@/lib/dates";

const rules: StayRules = {
  min_nights: 2,
  max_nights: 14,
  max_guests: 4,
  booking_window_days: 365,
  min_advance_days: 1,
  pets_allowed: false,
};
const today = "2026-03-01";
const taken = [{ start: "2026-03-10", end: "2026-03-15" }];
const check = (checkIn: string, checkOut: string, guests = 2, pets = false) =>
  validateStay(rules, [], taken, { checkIn, checkOut, guests, pets }, today);

describe("dates", () => {
  it("does date-only arithmetic across month, year and DST boundaries", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(diffDays("2026-03-07", "2026-03-09")).toBe(2); // US DST change on 8 Mar
    expect(eachNight("2026-03-30", "2026-04-02")).toEqual(["2026-03-30", "2026-03-31", "2026-04-01"]);
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
    expect(daysInMonth("2028-02-10")).toBe(29);
  });

  it("validates ISO dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("28/02/2026")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it("computes today in the site's timezone", () => {
    const instant = new Date("2026-03-01T03:30:00Z");
    expect(todayInTimezone("America/New_York", instant)).toBe("2026-02-28");
    expect(todayInTimezone("Europe/London", instant)).toBe("2026-03-01");
  });
});

describe("overlap", () => {
  it("treats ranges as half-open: checkout day is free for the next check-in", () => {
    expect(rangeOverlaps(taken, "2026-03-15", "2026-03-18")).toBe(false); // arrives on their checkout day
    expect(rangeOverlaps(taken, "2026-03-07", "2026-03-10")).toBe(false); // leaves on their check-in day
    expect(rangeOverlaps(taken, "2026-03-09", "2026-03-11")).toBe(true);
    expect(rangeOverlaps(taken, "2026-03-14", "2026-03-16")).toBe(true);
    expect(rangeOverlaps(taken, "2026-03-08", "2026-03-20")).toBe(true); // surrounds
    expect(isNightUnavailable(taken, "2026-03-14")).toBe(true);
    expect(isNightUnavailable(taken, "2026-03-15")).toBe(false);
  });
});

describe("validateStay", () => {
  it("accepts a valid stay", () => {
    expect(check("2026-03-04", "2026-03-07")).toEqual({ ok: true, nights: 3 });
  });
  it("rejects invalid or reversed dates", () => {
    expect(check("2026-03-07", "2026-03-04")).toMatchObject({ ok: false, code: "INVALID_DATES" });
    expect(check("nonsense", "2026-03-04")).toMatchObject({ ok: false, code: "INVALID_DATES" });
  });
  it("enforces the advance notice and never allows the past", () => {
    expect(check("2026-03-01", "2026-03-04")).toMatchObject({ ok: false, code: "TOO_SOON" });
    expect(check("2026-02-20", "2026-02-24")).toMatchObject({ ok: false, code: "TOO_SOON" });
    expect(check("2026-03-02", "2026-03-04")).toMatchObject({ ok: true });
  });
  it("enforces the booking window", () => {
    expect(bookingWindow(rules, today)).toEqual({ earliestCheckIn: "2026-03-02", latestCheckOut: "2027-03-01" });
    expect(check("2027-02-27", "2027-03-01")).toMatchObject({ ok: true });
    expect(check("2027-02-27", "2027-03-02")).toMatchObject({ ok: false, code: "TOO_FAR" });
  });
  it("enforces minimum and maximum nights", () => {
    expect(check("2026-03-04", "2026-03-05")).toMatchObject({ ok: false, code: "MIN_NIGHTS" });
    expect(check("2026-04-01", "2026-04-16")).toMatchObject({ ok: false, code: "MAX_NIGHTS" });
  });
  it("enforces a seasonal minimum stay", () => {
    const season = [{ name: "Peak", start_date: "2026-04-01", end_date: "2026-04-30", nightly_price_cents: 1, weekend_price_cents: null, min_nights: 5, priority: 0, created_at: "" }];
    expect(validateStay(rules, season, [], { checkIn: "2026-04-05", checkOut: "2026-04-08", guests: 2 }, today)).toMatchObject({ ok: false, code: "MIN_NIGHTS" });
    expect(validateStay(rules, season, [], { checkIn: "2026-04-05", checkOut: "2026-04-10", guests: 2 }, today)).toMatchObject({ ok: true });
  });
  it("enforces guest limits and the pet rule", () => {
    expect(check("2026-03-04", "2026-03-07", 5)).toMatchObject({ ok: false, code: "TOO_MANY_GUESTS" });
    expect(check("2026-03-04", "2026-03-07", 0)).toMatchObject({ ok: false, code: "TOO_MANY_GUESTS" });
    expect(check("2026-03-04", "2026-03-07", 2, true)).toMatchObject({ ok: false, code: "NO_PETS" });
  });
  it("rejects stays that touch unavailable nights", () => {
    expect(check("2026-03-08", "2026-03-11")).toMatchObject({ ok: false, code: "DATES_UNAVAILABLE" });
    expect(check("2026-03-15", "2026-03-18")).toMatchObject({ ok: true });
  });
});
