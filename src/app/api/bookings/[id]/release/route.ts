import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { serviceClient } from "@/lib/supabase/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Stripe sends the guest here when they click "back" on the Checkout page.
 * Releases the 30-minute hold straight away so the dates are bookable again,
 * then returns the guest to the property page. The booking id (a random UUID
 * known only to this guest's checkout) acts as the token.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/bookings/[id]/release">) {
  const { id } = await params;
  let slug: string | null = null;

  if (UUID.test(id)) {
    const db = serviceClient();
    const { data: booking } = await db
      .from("bookings")
      .select("id, status, stripe_session_id, property:properties(slug)")
      .eq("id", id)
      .maybeSingle();

    if (booking) {
      slug = (booking.property as unknown as { slug: string } | null)?.slug ?? null;
      if (booking.status === "pending") {
        if (booking.stripe_session_id) {
          try {
            // Make sure the abandoned session can no longer be paid.
            await getStripe().checkout.sessions.expire(booking.stripe_session_id);
          } catch (err) {
            // Already paid or already expired: leave the booking for the webhook to settle.
            console.warn(`[booking] could not expire session for ${id}: ${err instanceof Error ? err.message : err}`);
            return NextResponse.redirect(`${siteUrl()}${slug ? `/properties/${slug}` : "/properties"}`);
          }
        }
        await db.from("bookings").update({ status: "cancelled" }).eq("id", id).eq("status", "pending");
      }
    }
  }

  return NextResponse.redirect(`${siteUrl()}${slug ? `/properties/${slug}?checkout=cancelled#book` : "/properties"}`);
}
