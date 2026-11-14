import "server-only";
import { z } from "zod";
import { siteConfig } from "../../../site.config";
import { validateStay } from "@/lib/availability";
import { isIsoDate, todayInTimezone } from "@/lib/dates";
import { sendInquiryEmails } from "@/lib/email/booking";
import { isDemoMode, siteUrl } from "@/lib/env";
import { formatDate, plural } from "@/lib/format";
import { calculatePrice } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";
import { serviceClient } from "@/lib/supabase/service";
import type { Booking, DateRange, PricingRule, Property } from "@/lib/types";

/** Stripe's minimum Checkout session lifetime, and how long a pending booking holds its dates. */
export const HOLD_MINUTES = 30;

const isoDate = z.string().refine(isIsoDate, "Invalid date");

export const bookingRequestSchema = z.object({
  propertyId: z.uuid(),
  checkIn: isoDate,
  checkOut: isoDate,
  guests: z.number().int().min(1).max(50),
  pets: z.boolean().optional().default(false),
  name: z.string().trim().min(2, "Please enter your full name.").max(120),
  email: z.email("Please enter a valid email address.").max(200),
  phone: z.string().trim().min(6, "Please enter a phone number.").max(40),
  message: z.string().trim().max(2000).optional().nullable(),
  marketingOptIn: z.boolean().optional().default(false),
  acceptTerms: z.literal(true, "Please accept the house rules and policies to continue."),
  expectedTotalCents: z.number().int().optional(),
});

export type BookingResult =
  | { ok: true; type: "checkout"; url: string; reference: string }
  | { ok: true; type: "inquiry"; reference: string }
  | { ok: false; status: number; code: string; error: string };

const fail = (status: number, code: string, error: string): BookingResult => ({ ok: false, status, code, error });

export async function createBookingRequest(raw: unknown): Promise<BookingResult> {
  if (isDemoMode()) {
    return fail(403, "DEMO_MODE", "This is a preview site — online booking is not live yet.");
  }

  const parsed = bookingRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(400, "INVALID_INPUT", parsed.error.issues[0]?.message ?? "Please check your details and try again.");
  }
  const input = parsed.data;
  const db = serviceClient();

  const { data: propertyRow, error: propertyError } = await db
    .from("properties")
    .select("*, pricing_rules(*)")
    .eq("id", input.propertyId)
    .eq("is_published", true)
    .maybeSingle();
  if (propertyError) {
    console.error(`[booking] property lookup failed: ${propertyError.message}`);
    return fail(500, "SERVER_ERROR", "Something went wrong on our side. Please try again in a moment.");
  }
  if (!propertyRow) return fail(404, "NOT_FOUND", "This home is no longer available to book.");
  const property = propertyRow as Property & { pricing_rules: PricingRule[] };

  // 1. Validate against the property's rules and current availability.
  const { data: rangeRows, error: rangeError } = await db.rpc("unavailable_ranges", { p_property_id: property.id });
  if (rangeError) {
    console.error(`[booking] availability lookup failed: ${rangeError.message}`);
    return fail(500, "SERVER_ERROR", "Something went wrong on our side. Please try again in a moment.");
  }
  const ranges: DateRange[] = (rangeRows as { start_date: string; end_date: string }[]).map((r) => ({ start: r.start_date, end: r.end_date }));
  const today = todayInTimezone(siteConfig.timezone);
  const validation = validateStay(
    property,
    property.pricing_rules,
    ranges,
    { checkIn: input.checkIn, checkOut: input.checkOut, guests: input.guests, pets: input.pets },
    today,
  );
  if (!validation.ok) {
    return fail(validation.code === "DATES_UNAVAILABLE" ? 409 : 400, validation.code, validation.message);
  }

  // 2. The server is the only source of truth for the price.
  const price = calculatePrice(property, property.pricing_rules, input.checkIn, input.checkOut, { pets: input.pets });
  if (input.expectedTotalCents !== undefined && input.expectedTotalCents !== price.totalCents) {
    return fail(409, "PRICE_CHANGED", "The price for these dates has just changed. Please review the updated total and try again.");
  }

  // 3. Save the booking. The database re-checks availability under a lock.
  const inquiry = property.inquiry_only;
  const { data: created, error: createError } = await db.rpc("create_booking", {
    p_property_id: property.id,
    p_status: inquiry ? "inquiry" : "pending",
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_guests_count: input.guests,
    p_has_pets: input.pets && property.pets_allowed,
    p_guest_name: input.name,
    p_guest_email: input.email,
    p_guest_phone: input.phone,
    p_message: input.message ?? "",
    p_marketing_opt_in: input.marketingOptIn,
    p_currency: siteConfig.currency,
    p_accommodation_cents: price.accommodationCents,
    p_cleaning_fee_cents: price.cleaningFeeCents,
    p_pet_fee_cents: price.petFeeCents,
    p_tax_cents: price.taxCents,
    p_total_cents: price.totalCents,
    p_price_breakdown: price,
    p_hold_minutes: HOLD_MINUTES + 1,
  });
  if (createError) {
    if (createError.message.includes("DATES_UNAVAILABLE")) {
      return fail(409, "DATES_UNAVAILABLE", "Those dates were just taken. Please choose different dates.");
    }
    console.error(`[booking] create_booking failed: ${createError.message}`);
    return fail(500, "SERVER_ERROR", "We could not save your booking. Please try again in a moment.");
  }
  const booking = created as Booking;

  if (inquiry) {
    const results = await sendInquiryEmails(booking, property);
    if (results.some((r) => !r.sent)) console.warn(`[booking] inquiry ${booking.reference}: some emails were not sent`);
    return { ok: true, type: "inquiry", reference: booking.reference };
  }

  // 4. Re-check availability immediately before creating the Checkout session.
  const { data: stillFree, error: recheckError } = await db.rpc("recheck_pending_booking", { p_booking_id: booking.id });
  if (recheckError || stillFree !== true) {
    if (recheckError) console.error(`[booking] recheck failed: ${recheckError.message}`);
    return fail(409, "DATES_UNAVAILABLE", "Those dates were just taken. Please choose different dates.");
  }

  // 5. Create the Stripe Checkout session. It expires together with the hold.
  const expiresAt = Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60 + 10;
  const item = (name: string, amount: number, description?: string) => ({
    quantity: 1,
    price_data: {
      currency: siteConfig.currency.toLowerCase(),
      unit_amount: amount,
      product_data: { name, ...(description ? { description } : {}) },
    },
  });
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: booking.guest_email,
      client_reference_id: booking.id,
      expires_at: expiresAt,
      line_items: [
        item(
          `${property.name} — ${plural(booking.nights, "night")}`,
          price.accommodationCents,
          `${formatDate(booking.check_in)} to ${formatDate(booking.check_out)} · ${plural(booking.guests_count, "guest")}`,
        ),
        ...(price.cleaningFeeCents > 0 ? [item("Cleaning fee", price.cleaningFeeCents)] : []),
        ...(price.petFeeCents > 0 ? [item("Pet fee", price.petFeeCents)] : []),
        ...(price.taxCents > 0 ? [item(`Taxes (${price.taxRatePercent}%)`, price.taxCents)] : []),
      ],
      metadata: { booking_id: booking.id, reference: booking.reference },
      payment_intent_data: {
        description: `${siteConfig.name} booking ${booking.reference} — ${property.name}`,
        metadata: { booking_id: booking.id, reference: booking.reference },
      },
      success_url: `${siteUrl()}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/api/bookings/${booking.id}/release`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");

    const { error: updateError } = await db
      .from("bookings")
      .update({ stripe_session_id: session.id, expires_at: new Date(expiresAt * 1000).toISOString() })
      .eq("id", booking.id);
    if (updateError) throw new Error(`could not store the Stripe session: ${updateError.message}`);

    return { ok: true, type: "checkout", url: session.url, reference: booking.reference };
  } catch (err) {
    console.error(`[booking] checkout session failed for ${booking.reference}: ${err instanceof Error ? err.message : err}`);
    // Release the dates so the guest (or someone else) can try again.
    await db.from("bookings").update({ status: "expired" }).eq("id", booking.id).eq("status", "pending");
    return fail(502, "PAYMENT_UNAVAILABLE", "We could not start the payment. You have not been charged — please try again in a moment.");
  }
}
