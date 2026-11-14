"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, dayState } from "@/components/booking/calendar";
import { bookingWindow, validateStay } from "@/lib/availability";
import { diffDays, startOfMonth, todayInTimezone } from "@/lib/dates";
import { formatDate, formatMoney, plural } from "@/lib/format";
import { calculatePrice, minNightsFor } from "@/lib/pricing";
import type { DateRange, PricingRule, Property } from "@/lib/types";

export type WidgetProperty = Pick<
  Property,
  | "id" | "slug" | "name" | "max_guests" | "min_nights" | "max_nights" | "booking_window_days" | "min_advance_days"
  | "base_price_cents" | "weekend_price_cents" | "weekend_days" | "cleaning_fee_cents" | "pets_allowed"
  | "pet_fee_cents" | "tax_rate_percent" | "inquiry_only"
>;

type Availability = { status: "loading" } | { status: "error" } | { status: "ready"; today: string; ranges: DateRange[] };

type Props = { property: WidgetProperty; pricingRules: PricingRule[]; timezone: string; demoMode: boolean };

export function BookingWidget({ property, pricingRules, timezone, demoMode }: Props) {
  const [availability, setAvailability] = useState<Availability>({ status: "loading" });
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [guests, setGuests] = useState(Math.min(2, property.max_guests));
  const [pets, setPets] = useState(false);
  const [step, setStep] = useState<"dates" | "details" | "sent">("dates");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentReference, setSentReference] = useState<string | null>(null);
  const [cancelledNotice, setCancelledNotice] = useState(false);

  useEffect(() => {
    // Returning from Stripe after pressing "back": the hold has been released.
    if (new URLSearchParams(globalThis.location.search).get("checkout") === "cancelled") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once on mount
      setCancelledNotice(true);
    }
  }, []);

  const load = useCallback(async () => {
    setAvailability({ status: "loading" });
    try {
      const res = await fetch(`/api/availability/${property.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { today: string; ranges: DateRange[] };
      setAvailability({ status: "ready", today: data.today, ranges: data.ranges });
      setMonth((m) => m ?? startOfMonth(bookingWindow(property, data.today).earliestCheckIn));
    } catch {
      setAvailability({ status: "error" });
    }
  }, [property]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    load();
  }, [load]);

  const today = availability.status === "ready" ? availability.today : todayInTimezone(timezone);
  const ranges = useMemo(() => (availability.status === "ready" ? availability.ranges : []), [availability]);
  const window = bookingWindow(property, today);

  const onSelect = (date: string) => {
    setFormError(null);
    const state = dayState(date, { unavailable: ranges, ...window, checkIn, checkOut });
    if (state === "checkout") {
      setCheckOut(date);
    } else if (state === "checkin") {
      setCheckIn(date);
      setCheckOut(null);
    }
  };

  const clearDates = () => {
    setCheckIn(null);
    setCheckOut(null);
    setStep("dates");
    setFormError(null);
  };

  const hasDates = checkIn !== null && checkOut !== null;
  const validation = hasDates ? validateStay(property, pricingRules, ranges, { checkIn, checkOut, guests, pets }, today) : null;
  const price = hasDates ? calculatePrice(property, pricingRules, checkIn, checkOut, { pets }) : null;
  const minNights = checkIn ? minNightsFor(property, pricingRules, checkIn) : property.min_nights;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasDates || submitting) return;
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setFormError(null);
    let redirecting = false;
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          checkIn,
          checkOut,
          guests,
          pets,
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          message: form.get("message"),
          marketingOptIn: form.get("marketing") === "on",
          acceptTerms: form.get("terms") === "on",
          expectedTotalCents: price?.totalCents,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong. Please try again.");
        if (data.code === "DATES_UNAVAILABLE" || data.code === "PRICE_CHANGED") {
          await load();
          if (data.code === "DATES_UNAVAILABLE") {
            setCheckIn(null);
            setCheckOut(null);
            setStep("dates");
          }
        }
        return;
      }
      if (data.type === "checkout" && data.url) {
        redirecting = true; // keep the button in its "redirecting" state
        globalThis.location.assign(data.url);
        return;
      }
      setSentReference(data.reference ?? null);
      setStep("sent");
    } catch {
      setFormError("We could not reach the server. Please check your connection and try again.");
    } finally {
      if (!redirecting) setSubmitting(false);
    }
  };

  if (step === "sent") {
    return (
      <div className="card p-6" role="status">
        <h2 className="text-2xl font-semibold text-ink">Request sent</h2>
        <p className="mt-2 text-ink-soft">
          Thank you — we have received your request{sentReference ? ` (reference ${sentReference})` : ""} for {formatDate(checkIn!)} to {formatDate(checkOut!)}.
          We will reply by email shortly to confirm availability and next steps.
        </p>
        <button type="button" onClick={clearDates} className="btn-outline mt-5">Choose other dates</button>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-semibold text-ink">{property.inquiry_only ? "Request your dates" : "Check availability"}</h2>
        <p className="text-sm text-ink-soft">{plural(minNights, "night")} min.</p>
      </div>

      {cancelledNotice && (
        <p role="status" className="mt-3 rounded-lg border border-line bg-muted px-3 py-2 text-sm text-ink">
          Your payment was cancelled and you have not been charged. The dates are free to book again.
        </p>
      )}

      {availability.status === "loading" && (
        <div className="mt-4 space-y-3" role="status" aria-label="Loading availability">
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-[26rem] w-full" />
        </div>
      )}

      {availability.status === "error" && (
        <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          <p>We could not load the calendar just now.</p>
          <button type="button" onClick={load} className="mt-2 font-semibold underline underline-offset-4">Try again</button>
        </div>
      )}

      {availability.status === "ready" && month && (
        <>
          <div className="mt-4">
            <Calendar
              month={month}
              onMonthChange={setMonth}
              unavailable={ranges}
              earliestCheckIn={window.earliestCheckIn}
              latestCheckOut={window.latestCheckOut}
              checkIn={checkIn}
              checkOut={checkOut}
              onSelect={onSelect}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-line text-sm">
            <div className="border-r border-line px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-ink-soft">Check-in</p>
              <p className="font-medium text-ink">{checkIn ? formatDate(checkIn) : "Select a date"}</p>
            </div>
            <div className="px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-ink-soft">Check-out</p>
              <p className="font-medium text-ink">{checkOut ? formatDate(checkOut) : checkIn ? "Select a date" : "—"}</p>
            </div>
          </div>
          {checkIn && (
            <button type="button" onClick={clearDates} className="mt-2 text-sm text-primary underline underline-offset-4">Clear dates</button>
          )}

          <div className="mt-4 grid gap-3">
            <div>
              <label htmlFor="booking-guests" className="label">Guests</label>
              <select id="booking-guests" value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="field">
                {Array.from({ length: property.max_guests }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{plural(n, "guest")}</option>
                ))}
              </select>
            </div>
            {property.pets_allowed && (
              <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
                <input type="checkbox" checked={pets} onChange={(e) => setPets(e.target.checked)} className="h-5 w-5 accent-[var(--brand-primary)]" />
                Bringing a pet{property.pet_fee_cents > 0 ? ` (+${formatMoney(property.pet_fee_cents)})` : ""}
              </label>
            )}
          </div>

          {price && hasDates && (
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm" aria-label="Price breakdown">
              {price.lines.map((line) => (
                <div key={`${line.label}-${line.unitCents}`} className="flex justify-between gap-4">
                  <dt className="text-ink-soft">
                    {formatMoney(line.unitCents)} × {plural(line.nights, "night")}{line.label ? ` (${line.label.toLowerCase()})` : ""}
                  </dt>
                  <dd className="tabular-nums text-ink">{formatMoney(line.totalCents)}</dd>
                </div>
              ))}
              {price.cleaningFeeCents > 0 && (
                <div className="flex justify-between gap-4"><dt className="text-ink-soft">Cleaning fee</dt><dd className="tabular-nums text-ink">{formatMoney(price.cleaningFeeCents)}</dd></div>
              )}
              {price.petFeeCents > 0 && (
                <div className="flex justify-between gap-4"><dt className="text-ink-soft">Pet fee</dt><dd className="tabular-nums text-ink">{formatMoney(price.petFeeCents)}</dd></div>
              )}
              {price.taxCents > 0 && (
                <div className="flex justify-between gap-4"><dt className="text-ink-soft">Taxes ({price.taxRatePercent}%)</dt><dd className="tabular-nums text-ink">{formatMoney(price.taxCents, { alwaysCents: true })}</dd></div>
              )}
              <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold text-ink">
                <dt>Total for {plural(diffDays(checkIn, checkOut), "night")}</dt>
                <dd className="tabular-nums" data-testid="booking-total">{formatMoney(price.totalCents, { alwaysCents: price.taxCents > 0 })}</dd>
              </div>
            </dl>
          )}

          {validation && !validation.ok && (
            <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{validation.message}</p>
          )}

          {step === "dates" && (
            <div className="mt-5">
              {demoMode ? (
                <>
                  <button type="button" disabled className="btn-primary w-full">Booking available soon</button>
                  <p className="mt-2 text-center text-xs text-ink-soft">This is a preview site — online booking is not live yet.</p>
                </>
              ) : (
                <button type="button" disabled={!validation?.ok} onClick={() => setStep("details")} className="btn-primary w-full">
                  {!hasDates ? "Select your dates" : property.inquiry_only ? "Continue to request" : "Reserve"}
                </button>
              )}
              {!demoMode && !property.inquiry_only && <p className="mt-2 text-center text-xs text-ink-soft">You won’t be charged yet.</p>}
            </div>
          )}

          {step === "details" && validation?.ok && !demoMode && (
            <form onSubmit={submit} className="mt-5 space-y-4 border-t border-line pt-5">
              <h3 className="text-xl font-semibold text-ink">Your details</h3>
              <div>
                <label htmlFor="booking-name" className="label">Full name</label>
                <input id="booking-name" name="name" required minLength={2} maxLength={120} autoComplete="name" className="field" />
              </div>
              <div>
                <label htmlFor="booking-email" className="label">Email</label>
                <input id="booking-email" name="email" type="email" required maxLength={200} autoComplete="email" className="field" />
              </div>
              <div>
                <label htmlFor="booking-phone" className="label">Phone</label>
                <input id="booking-phone" name="phone" type="tel" required minLength={6} maxLength={40} autoComplete="tel" className="field" />
              </div>
              <div>
                <label htmlFor="booking-message" className="label">
                  {property.inquiry_only ? "Tell us about your trip" : "Anything we should know?"} <span className="font-normal text-ink-soft">(optional)</span>
                </label>
                <textarea id="booking-message" name="message" rows={3} maxLength={2000} className="field" />
              </div>
              <label className="flex items-start gap-3 text-sm text-ink">
                <input type="checkbox" name="terms" required className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-primary)]" />
                <span>
                  I agree to the <Link href="/policies" target="_blank" className="text-primary underline underline-offset-4">house rules, cancellation policy and terms<span className="sr-only"> (opens in a new tab)</span></Link>.
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm text-ink-soft">
                <input type="checkbox" name="marketing" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-primary)]" />
                <span>Email me occasional offers for future stays.</span>
              </label>
              {formError && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{formError}</p>}
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting
                  ? property.inquiry_only ? "Sending…" : "Taking you to secure payment…"
                  : property.inquiry_only ? "Send request" : `Continue to payment · ${formatMoney(price!.totalCents, { alwaysCents: price!.taxCents > 0 })}`}
              </button>
              {!property.inquiry_only && (
                <p className="text-center text-xs text-ink-soft">Secure payment by Stripe. Your dates are held for 30 minutes while you pay.</p>
              )}
            </form>
          )}
        </>
      )}
    </div>
  );
}
