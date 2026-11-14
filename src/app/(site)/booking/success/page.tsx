import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { siteConfig } from "../../../../../site.config";
import { AutoRefresh } from "@/components/booking/auto-refresh";
import { formatDate, formatMoney, formatTime, plural } from "@/lib/format";
import { serviceClient } from "@/lib/supabase/service";
import type { Booking, Property } from "@/lib/types";

export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

export default function BookingSuccessPage({ searchParams }: PageProps<"/booking/success">) {
  return (
    <div className="container-page max-w-2xl py-16 sm:py-24">
      <Suspense fallback={<div role="status" aria-label="Loading your booking"><div className="skeleton h-10 w-2/3" /><div className="skeleton mt-6 h-64 w-full" /></div>}>
        <BookingStatus searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function BookingStatus({ searchParams }: Pick<PageProps<"/booking/success">, "searchParams">) {
  const sessionId = (await searchParams).session_id;
  const contact = (
    <p className="mt-6 text-ink-soft">
      Questions? Email <a className="text-primary underline underline-offset-4" href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>.
    </p>
  );

  // The Stripe session id is long and random — it is the guest's key to this page.
  let row: (Booking & { property: Pick<Property, "name" | "slug" | "location_label" | "check_in_time" | "check_out_time"> }) | null = null;
  if (typeof sessionId === "string" && /^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) {
    const { data, error } = await serviceClient()
      .from("bookings")
      .select("*, property:properties(name, slug, location_label, check_in_time, check_out_time)")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    if (error) throw new Error("We could not load your booking.");
    row = data;
  }

  if (!row) {
    return (
      <>
        <h1 className="text-4xl font-semibold text-ink">We couldn’t find that booking</h1>
        <p className="mt-4 text-ink-soft">If you completed a payment, your confirmation email is on its way and your booking is safe.</p>
        {contact}
        <Link href="/properties" className="btn-primary mt-8">Browse stays</Link>
      </>
    );
  }

  const { property, ...booking } = row;

  if (booking.status === "conflict") {
    return (
      <>
        <p className="eyebrow">Booking not confirmed</p>
        <h1 className="mt-2 text-4xl font-semibold text-ink">We’re sorry — those dates were just taken</h1>
        <p className="mt-4 text-ink-soft">
          Someone booked the same dates moments before your payment completed. Your payment is being refunded in full
          (reference {booking.reference}); it can take 5–10 business days to appear on your statement.
        </p>
        {contact}
        <Link href={`/properties/${property.slug}`} className="btn-primary mt-8">Choose other dates</Link>
      </>
    );
  }

  if (booking.status !== "confirmed") {
    const waiting = booking.status === "pending";
    return (
      <>
        {waiting && <AutoRefresh />}
        <p className="eyebrow">{waiting ? "Almost there" : "Booking not completed"}</p>
        <h1 className="mt-2 text-4xl font-semibold text-ink">
          {waiting ? "Confirming your payment…" : "This booking was not completed"}
        </h1>
        <p className="mt-4 text-ink-soft" role="status">
          {waiting
            ? `We are waiting for confirmation from our payment provider (reference ${booking.reference}). This page updates automatically and you will also receive an email.`
            : "The payment was not completed, so no booking was made and you have not been charged."}
        </p>
        {contact}
        {!waiting && <Link href={`/properties/${property.slug}`} className="btn-primary mt-8">Try again</Link>}
      </>
    );
  }

  const money = (cents: number) => formatMoney(cents, { currency: booking.currency, alwaysCents: true });
  const rows: [string, string][] = [
    ["Reference", booking.reference],
    ["Home", `${property.name}, ${property.location_label}`],
    ["Check-in", `${formatDate(booking.check_in, "long")}, after ${formatTime(property.check_in_time ?? siteConfig.defaults.checkInTime)}`],
    ["Check-out", `${formatDate(booking.check_out, "long")}, before ${formatTime(property.check_out_time ?? siteConfig.defaults.checkOutTime)}`],
    ["Guests", `${plural(booking.guests_count, "guest")}${booking.has_pets ? " + pet" : ""}`],
    ["Total paid", money(booking.total_cents)],
  ];

  return (
    <>
      <p className="eyebrow">Booking confirmed</p>
      <h1 className="mt-2 text-4xl font-semibold text-ink sm:text-5xl">Thank you, {booking.guest_name.split(" ")[0]} — you’re booked!</h1>
      <p className="mt-4 text-ink-soft">
        A confirmation has been sent to <span className="font-medium text-ink">{booking.guest_email}</span>. We will be in touch before your stay with arrival details.
      </p>
      <dl className="card mt-8 divide-y divide-line px-6">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-6 py-3.5 text-sm">
            <dt className="text-ink-soft">{label}</dt>
            <dd className="text-right font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {contact}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/guide" className="btn-primary">Plan your stay with our local guide</Link>
        <Link href="/" className="btn-outline">Back to home</Link>
      </div>
    </>
  );
}
