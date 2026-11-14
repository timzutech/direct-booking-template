import { addDays, diffDays, isIsoDate } from "@/lib/dates";
import { minNightsFor, type PricingRuleInput } from "@/lib/pricing";
import type { DateRange, Property } from "@/lib/types";

/**
 * Stay validation against a property's booking rules. Shared by the widget
 * (instant feedback) and the server (authoritative). The final guarantee
 * against double bookings is the locked check in the database.
 */

export type StayRules = Pick<
  Property,
  "min_nights" | "max_nights" | "max_guests" | "booking_window_days" | "min_advance_days" | "pets_allowed"
>;

export type StayRequest = { checkIn: string; checkOut: string; guests: number; pets?: boolean };

export type StayError =
  | "INVALID_DATES"
  | "TOO_SOON"
  | "TOO_FAR"
  | "MIN_NIGHTS"
  | "MAX_NIGHTS"
  | "TOO_MANY_GUESTS"
  | "NO_PETS"
  | "DATES_UNAVAILABLE";

export type StayValidation = { ok: true; nights: number } | { ok: false; code: StayError; message: string };

/** True if any night of [checkIn, checkOut) falls inside an unavailable range. */
export function rangeOverlaps(ranges: DateRange[], checkIn: string, checkOut: string): boolean {
  return ranges.some((r) => r.start < checkOut && r.end > checkIn);
}

export function isNightUnavailable(ranges: DateRange[], night: string): boolean {
  return ranges.some((r) => r.start <= night && night < r.end);
}

/** First and last dates a guest may check in / check out, given today's date. */
export function bookingWindow(rules: StayRules, today: string): { earliestCheckIn: string; latestCheckOut: string } {
  return {
    earliestCheckIn: addDays(today, rules.min_advance_days),
    latestCheckOut: addDays(today, rules.booking_window_days),
  };
}

export function validateStay(
  rules: StayRules,
  pricingRules: PricingRuleInput[],
  unavailable: DateRange[],
  request: StayRequest,
  today: string,
): StayValidation {
  const { checkIn, checkOut, guests } = request;
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkOut <= checkIn) {
    return { ok: false, code: "INVALID_DATES", message: "Please choose a check-in and a check-out date." };
  }
  const nights = diffDays(checkIn, checkOut);
  const { earliestCheckIn, latestCheckOut } = bookingWindow(rules, today);

  if (checkIn < earliestCheckIn) {
    return {
      ok: false,
      code: "TOO_SOON",
      message:
        rules.min_advance_days > 0
          ? `Check-in must be at least ${rules.min_advance_days} day${rules.min_advance_days === 1 ? "" : "s"} from today.`
          : "Check-in cannot be in the past.",
    };
  }
  if (checkOut > latestCheckOut) {
    return {
      ok: false,
      code: "TOO_FAR",
      message: `Bookings open ${rules.booking_window_days} days in advance. Please choose earlier dates.`,
    };
  }
  const minNights = minNightsFor(rules, pricingRules, checkIn);
  if (nights < minNights) {
    return { ok: false, code: "MIN_NIGHTS", message: `The minimum stay for these dates is ${minNights} nights.` };
  }
  if (nights > rules.max_nights) {
    return { ok: false, code: "MAX_NIGHTS", message: `The maximum stay is ${rules.max_nights} nights.` };
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > rules.max_guests) {
    return { ok: false, code: "TOO_MANY_GUESTS", message: `This home sleeps up to ${rules.max_guests} guests.` };
  }
  if (request.pets && !rules.pets_allowed) {
    return { ok: false, code: "NO_PETS", message: "Sorry, pets are not allowed at this home." };
  }
  if (rangeOverlaps(unavailable, checkIn, checkOut)) {
    return { ok: false, code: "DATES_UNAVAILABLE", message: "Those dates are no longer available. Please choose different dates." };
  }
  return { ok: true, nights };
}
