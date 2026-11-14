import "server-only";
import { siteConfig } from "../../../site.config";
import { emailLayout, emailParagraph, emailRows, sendEmail, type SendResult } from "@/lib/email/send";
import { env, siteUrl } from "@/lib/env";
import { formatDate, formatMoney, formatTime, plural } from "@/lib/format";
import type { Booking, Property } from "@/lib/types";

type EmailProperty = Pick<Property, "name" | "slug" | "address" | "location_label" | "check_in_time" | "check_out_time">;

function money(booking: Booking, cents: number) {
  return formatMoney(cents, { currency: booking.currency, alwaysCents: true });
}

function stayRows(booking: Booking, property: EmailProperty): [string, string | null][] {
  return [
    ["Reference", booking.reference],
    ["Home", property.name],
    ["Check-in", `${formatDate(booking.check_in, "long")}, after ${formatTime(property.check_in_time ?? siteConfig.defaults.checkInTime)}`],
    ["Check-out", `${formatDate(booking.check_out, "long")}, before ${formatTime(property.check_out_time ?? siteConfig.defaults.checkOutTime)}`],
    ["Nights", String(booking.nights)],
    ["Guests", `${plural(booking.guests_count, "guest")}${booking.has_pets ? " + pet" : ""}`],
  ];
}

function priceRows(booking: Booking): [string, string | null][] {
  return [
    ["Accommodation", money(booking, booking.accommodation_cents)],
    ["Cleaning fee", booking.cleaning_fee_cents ? money(booking, booking.cleaning_fee_cents) : null],
    ["Pet fee", booking.pet_fee_cents ? money(booking, booking.pet_fee_cents) : null],
    ["Taxes", booking.tax_cents ? money(booking, booking.tax_cents) : null],
    ["Total", money(booking, booking.total_cents)],
  ];
}

function guestRows(booking: Booking): [string, string | null][] {
  return [["Guest", booking.guest_name], ["Email", booking.guest_email], ["Phone", booking.guest_phone], ["Message", booking.message]];
}

const adminLink = () =>
  `<p style="margin:16px 0 0;font-size:14px;"><a href="${siteUrl()}/admin/bookings">Open the bookings dashboard</a></p>`;

/** Payment succeeded and the booking is confirmed: email guest and host. */
export async function sendBookingConfirmedEmails(booking: Booking, property: EmailProperty): Promise<SendResult[]> {
  const guest = sendEmail({
    to: booking.guest_email,
    replyTo: env.hostEmail,
    subject: `Booking confirmed — ${property.name} (${booking.reference})`,
    html: emailLayout(
      `You’re booked, ${booking.guest_name.split(" ")[0]}!`,
      emailParagraph(`Thank you for booking direct with ${siteConfig.name}. Your payment has been received and your stay is confirmed.`) +
        emailRows([...stayRows(booking, property), ["Address", property.address ?? property.location_label]]) +
        emailRows(priceRows(booking).map(([label, value]) => [label === "Total" ? "Total paid" : label, value])) +
        emailParagraph("We will be in touch before your stay with arrival details. If you have any questions, just reply to this email.") +
        `<p style="margin:0;font-size:14px;"><a href="${siteUrl()}/policies">House rules and cancellation policy</a></p>`,
    ),
  });
  const host = sendEmail({
    to: env.hostEmail,
    replyTo: booking.guest_email,
    subject: `New booking: ${property.name}, ${formatDate(booking.check_in)} – ${formatDate(booking.check_out)}`,
    html: emailLayout(
      "New confirmed booking",
      emailParagraph("A guest has booked and paid on your website.") +
        emailRows(stayRows(booking, property)) + emailRows(guestRows(booking)) + emailRows(priceRows(booking)) + adminLink(),
    ),
  });
  return Promise.all([guest, host]);
}

/** Inquiry-only property: acknowledge the guest and notify the host. */
export async function sendInquiryEmails(booking: Booking, property: EmailProperty): Promise<SendResult[]> {
  const guest = sendEmail({
    to: booking.guest_email,
    replyTo: env.hostEmail,
    subject: `We received your request — ${property.name} (${booking.reference})`,
    html: emailLayout(
      "Thanks for your request",
      emailParagraph(`We have received your request to stay at ${property.name}. This is not a confirmed booking yet — we will reply shortly to confirm availability and next steps.`) +
        emailRows(stayRows(booking, property)) +
        emailRows([["Estimated total", money(booking, booking.total_cents)]]),
    ),
  });
  const host = sendEmail({
    to: env.hostEmail,
    replyTo: booking.guest_email,
    subject: `New booking request: ${property.name}, ${formatDate(booking.check_in)} – ${formatDate(booking.check_out)}`,
    html: emailLayout(
      "New booking request",
      emailParagraph("A guest has sent a request. Reply to this email to answer them directly. The dates are NOT blocked until you block them or confirm a booking.") +
        emailRows(stayRows(booking, property)) + emailRows(guestRows(booking)) + emailRows(priceRows(booking)) + adminLink(),
    ),
  });
  return Promise.all([guest, host]);
}

/** Rare: payment arrived but the dates were taken in the meantime. The payment has been refunded. */
export async function sendBookingConflictEmails(booking: Booking, property: EmailProperty, refunded: boolean): Promise<SendResult[]> {
  const guest = sendEmail({
    to: booking.guest_email,
    replyTo: env.hostEmail,
    subject: `About your booking at ${property.name} (${booking.reference})`,
    html: emailLayout(
      "We’re sorry — those dates were just taken",
      emailParagraph(`Unfortunately the dates you chose at ${property.name} were booked moments before your payment completed, so we could not confirm your stay.`) +
        emailParagraph(refunded
          ? "Your payment has been refunded in full. Depending on your bank, it can take 5–10 business days to appear."
          : "We are refunding your payment in full and will confirm by email as soon as it is done.") +
        emailRows(stayRows(booking, property)) +
        emailParagraph("Please reply to this email and we will gladly help you find other dates."),
    ),
  });
  const host = sendEmail({
    to: env.hostEmail,
    replyTo: booking.guest_email,
    subject: `ACTION NEEDED: double-booking prevented at ${property.name} (${booking.reference})`,
    html: emailLayout(
      "A paid booking could not be confirmed",
      emailParagraph("A guest paid, but the dates had been taken (for example by an imported calendar block) before the payment completed. The booking was NOT confirmed.") +
        emailParagraph(refunded
          ? "The payment has been refunded automatically. No action is needed, but you may wish to contact the guest."
          : "The automatic refund FAILED. Please refund this payment manually in your Stripe dashboard.") +
        emailRows(stayRows(booking, property)) + emailRows(guestRows(booking)) + emailRows(priceRows(booking)) + adminLink(),
    ),
  });
  return Promise.all([guest, host]);
}
