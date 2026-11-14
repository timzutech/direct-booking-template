import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendBookingConfirmedEmails, sendBookingConflictEmails } from "@/lib/email/booking";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { serviceClient } from "@/lib/supabase/service";
import type { Booking, Property } from "@/lib/types";

/**
 * Stripe webhook. Subscribe the endpoint to:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.async_payment_failed, checkout.session.expired
 *
 * Responds 2xx once an event is fully handled; 5xx makes Stripe retry later.
 * Handling is idempotent, so retries and duplicate deliveries are safe.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("missing stripe-signature header");
    event = getStripe().webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
  } catch (err) {
    console.warn(`[stripe] rejected webhook: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        // "completed" with payment_status "unpaid" means a delayed payment method; wait for async_payment_succeeded.
        if (session.payment_status === "paid") await handlePaid(session);
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await handleNotPaid(event.data.object);
        break;
      default:
        break; // other event types are ignored
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[stripe] failed handling ${event.type} (${event.id}): ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}

function bookingIdOf(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.booking_id ?? session.client_reference_id ?? null;
}

async function loadBooking(id: string) {
  const { data, error } = await serviceClient()
    .from("bookings")
    .select("*, property:properties(name, slug, address, location_label, check_in_time, check_out_time)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`booking lookup failed: ${error.message}`);
  if (!data) return null;
  const { property, ...booking } = data as Booking & {
    property: Pick<Property, "name" | "slug" | "address" | "location_label" | "check_in_time" | "check_out_time">;
  };
  return { booking: booking as Booking, property };
}

async function handlePaid(session: Stripe.Checkout.Session) {
  const bookingId = bookingIdOf(session);
  if (!bookingId) {
    console.warn(`[stripe] paid session ${session.id} has no booking id — ignored`);
    return;
  }
  const db = serviceClient();
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

  // Availability is re-checked inside confirm_booking, under the property lock.
  const { data: outcome, error } = await db.rpc("confirm_booking", {
    p_booking_id: bookingId,
    p_stripe_session_id: session.id,
    p_payment_intent_id: paymentIntentId,
  });
  if (error) throw new Error(`confirm_booking failed: ${error.message}`);

  if (outcome === "not_found") {
    console.warn(`[stripe] paid session ${session.id}: booking ${bookingId} not found`);
    return;
  }
  if (outcome === "already_confirmed") return; // duplicate delivery

  const loaded = await loadBooking(bookingId);
  if (!loaded) return;
  const { booking, property } = loaded;

  if (outcome === "confirmed") {
    await sendBookingConfirmedEmails(booking, property);
    return;
  }

  if (outcome === "conflict") {
    if (booking.refunded_at) return; // already refunded on an earlier delivery
    let refunded = false;
    if (paymentIntentId) {
      try {
        await getStripe().refunds.create(
          { payment_intent: paymentIntentId, reason: "requested_by_customer", metadata: { booking_id: booking.id, reason: "dates_unavailable" } },
          { idempotencyKey: `refund-conflict-${booking.id}` },
        );
        refunded = true;
        await db.from("bookings").update({ refunded_at: new Date().toISOString() }).eq("id", booking.id);
      } catch (err) {
        console.error(`[stripe] REFUND FAILED for ${booking.reference}: ${err instanceof Error ? err.message : err}`);
      }
    }
    // If the refund failed, the host email says to refund manually in Stripe.
    await sendBookingConflictEmails(booking, property, refunded);
  }
}

async function handleNotPaid(session: Stripe.Checkout.Session) {
  const bookingId = bookingIdOf(session);
  if (!bookingId) return;
  const { error } = await serviceClient()
    .from("bookings")
    .update({ status: "expired" })
    .eq("id", bookingId)
    .eq("status", "pending");
  if (error) throw new Error(`could not expire booking: ${error.message}`);
}
