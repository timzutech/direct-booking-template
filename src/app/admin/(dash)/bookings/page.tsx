import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "../../../../../site.config";
import { updateBooking } from "../../actions";
import { todayInTimezone } from "@/lib/dates";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageTitle, StatusBadge, statusLabels } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDate, formatDateTime, formatMoney, plural } from "@/lib/format";
import type { Booking, BookingStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Bookings" };

const statuses = Object.keys(statusLabels) as BookingStatus[];
const PAGE_SIZE = 50;

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const status = statuses.includes(one(sp.status) as BookingStatus) ? (one(sp.status) as BookingStatus) : "";
  const propertyId = /^[0-9a-f-]{36}$/i.test(one(sp.property)) ? one(sp.property) : "";
  const when = ["upcoming", "past"].includes(one(sp.when)) ? one(sp.when) : "";
  const search = one(sp.q).trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const { data: properties, error: propertiesError } = await db.from("properties").select("id, name").order("name");
  if (propertiesError) throw new Error("Bookings could not be loaded.");

  let query = db.from("bookings").select("*, property:properties(name)", { count: "exact" });
  query =
    when === "upcoming" ? query.order("check_in")
    : when === "past" ? query.order("check_in", { ascending: false })
    : query.order("created_at", { ascending: false });
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (propertyId) query = query.eq("property_id", propertyId);
  const today = todayInTimezone(siteConfig.timezone);
  if (when === "upcoming") query = query.gte("check_out", today);
  if (when === "past") query = query.lt("check_out", today);
  if (search) {
    const term = search.replace(/[%_,()\\]/g, " ");
    query = query.or(`guest_name.ilike.%${term}%,guest_email.ilike.%${term}%,reference.ilike.%${term}%`);
  }
  const { data, error, count } = await query;
  if (error) throw new Error("Bookings could not be loaded.");
  const bookings = data as (Booking & { property: { name: string } })[];
  const filtered = !!(status || propertyId || when || search);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const pageLink = (n: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (propertyId) params.set("property", propertyId);
    if (when) params.set("when", when);
    if (search) params.set("q", search);
    params.set("page", String(n));
    return `?${params}`;
  };

  return (
    <>
      <PageTitle title="Bookings">
        <p className="text-sm text-ink-soft">{plural(count ?? 0, "booking")}{filtered ? " match" : ""}</p>
      </PageTitle>

      <form method="get" className="card mb-6 grid items-end gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <div><label htmlFor="filter-q" className="label">Search</label><input id="filter-q" name="q" defaultValue={search} placeholder="Guest name, email or reference" className="field" /></div>
        <div>
          <label htmlFor="filter-status" className="label">Status</label>
          <select id="filter-status" name="status" defaultValue={status} className="field">
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="filter-property" className="label">Property</label>
          <select id="filter-property" name="property" defaultValue={propertyId} className="field">
            <option value="">All properties</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="filter-when" className="label">Dates</label>
          <select id="filter-when" name="when" defaultValue={when} className="field">
            <option value="">Newest first</option>
            <option value="upcoming">Upcoming stays</option>
            <option value="past">Past stays</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary">Filter</button>
          {filtered && <Link href="/admin/bookings" className="text-sm text-primary underline underline-offset-4">Clear</Link>}
        </div>
      </form>

      {bookings.length === 0 ? (
        <p className="card p-8 text-center text-ink-soft">{filtered ? "No bookings match these filters." : "No bookings yet. They will appear here as soon as guests book."}</p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.id} className="card">
              <details className="group">
                <summary className="grid cursor-pointer list-none items-center gap-x-6 gap-y-1 p-4 sm:grid-cols-[1.3fr_1.3fr_1fr_auto] [&::-webkit-details-marker]:hidden">
                  <div>
                    <p className="font-semibold text-ink">{b.guest_name}</p>
                    <p className="text-sm text-ink-soft">{b.property.name} · {b.reference}</p>
                  </div>
                  <p className="text-sm text-ink">{formatDate(b.check_in)} → {formatDate(b.check_out)}<span className="text-ink-soft"> · {plural(b.nights, "night")}</span></p>
                  <p className="text-sm font-semibold tabular-nums text-ink">{formatMoney(b.total_cents, { currency: b.currency, alwaysCents: true })}</p>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={b.status} />
                    <span className="text-sm text-primary underline underline-offset-4 group-open:hidden">Details</span>
                    <span className="hidden text-sm text-primary underline underline-offset-4 group-open:inline">Hide</span>
                  </div>
                </summary>
                <div className="grid gap-6 border-t border-line p-4 text-sm md:grid-cols-3">
                  <dl className="space-y-1.5">
                    <dt className="font-semibold text-ink">Guest</dt>
                    <dd><a href={`mailto:${b.guest_email}`} className="text-primary underline underline-offset-4">{b.guest_email}</a></dd>
                    {b.guest_phone && <dd><a href={`tel:${b.guest_phone.replace(/[^+\d]/g, "")}`} className="text-primary underline underline-offset-4">{b.guest_phone}</a></dd>}
                    <dd className="text-ink-soft">{plural(b.guests_count, "guest")}{b.has_pets ? " + pet" : ""}</dd>
                    {b.message && <dd className="whitespace-pre-line rounded-lg bg-muted p-3 text-ink">“{b.message}”</dd>}
                  </dl>
                  <dl className="space-y-1.5">
                    <dt className="font-semibold text-ink">Amounts</dt>
                    {([["Accommodation", b.accommodation_cents], ["Cleaning fee", b.cleaning_fee_cents], ["Pet fee", b.pet_fee_cents], ["Taxes", b.tax_cents]] as const)
                      .filter(([, cents]) => cents > 0)
                      .map(([label, cents]) => (
                        <dd key={label} className="flex justify-between gap-4 text-ink-soft"><span>{label}</span><span className="tabular-nums">{formatMoney(cents, { currency: b.currency, alwaysCents: true })}</span></dd>
                      ))}
                    <dd className="flex justify-between gap-4 border-t border-line pt-1.5 font-semibold text-ink"><span>Total</span><span className="tabular-nums">{formatMoney(b.total_cents, { currency: b.currency, alwaysCents: true })}</span></dd>
                    <dd className="pt-2 text-xs text-ink-soft">
                      Created {formatDateTime(b.created_at)}
                      {b.confirmed_at && <><br />Paid {formatDateTime(b.confirmed_at)}</>}
                      {b.refunded_at && <><br />Refunded {formatDateTime(b.refunded_at)}</>}
                      {b.stripe_payment_intent_id && <><br />Stripe payment: <span className="font-mono">{b.stripe_payment_intent_id}</span></>}
                    </dd>
                  </dl>
                  <div className="space-y-4">
                    <ActionForm action={updateBooking}>
                      <input type="hidden" name="id" value={b.id} /><input type="hidden" name="intent" value="notes" />
                      <label htmlFor={`notes-${b.id}`} className="label">Private notes</label>
                      <textarea id={`notes-${b.id}`} name="notes" rows={3} defaultValue={b.notes ?? ""} className="field" />
                      <SubmitButton variant="outline" className="mt-2">Save note</SubmitButton>
                    </ActionForm>
                    {(b.status === "confirmed" || b.status === "pending") && (
                      <ActionForm action={updateBooking} confirm={`Cancel booking ${b.reference}? The dates will be released. Any refund must be made in Stripe.`}>
                        <input type="hidden" name="id" value={b.id} /><input type="hidden" name="intent" value="cancel" />
                        <SubmitButton variant="danger" pendingText="Cancelling…">Cancel booking</SubmitButton>
                      </ActionForm>
                    )}
                    {b.status === "inquiry" && (
                      <ActionForm action={updateBooking} confirm="Mark this request as declined?">
                        <input type="hidden" name="id" value={b.id} /><input type="hidden" name="intent" value="decline" />
                        <SubmitButton variant="outline" pendingText="Saving…">Mark as declined</SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? <Link href={pageLink(page - 1)} className="text-primary underline underline-offset-4">Previous</Link> : <span className="text-ink-soft">Previous</span>}
          <span className="text-ink-soft">Page {page} of {pages}</span>
          {page < pages ? <Link href={pageLink(page + 1)} className="text-primary underline underline-offset-4">Next</Link> : <span className="text-ink-soft">Next</span>}
        </nav>
      )}
    </>
  );
}
