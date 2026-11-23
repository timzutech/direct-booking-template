import Link from "next/link";
import { siteConfig } from "../../../../site.config";
import { syncNow } from "../actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Note, PageTitle, Panel, StatusBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { todayInTimezone } from "@/lib/dates";
import { isDemoMode, paymentsEnabled } from "@/lib/env";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { Booking, IcalFeed } from "@/lib/types";

export default async function AdminOverviewPage() {
  const { db } = await requireAdmin();
  const today = todayInTimezone(siteConfig.timezone);

  const [upcoming, requests, feeds] = await Promise.all([
    db.from("bookings").select("*, property:properties(name)").eq("status", "confirmed").gte("check_out", today).order("check_in").limit(8),
    db.from("bookings").select("*, property:properties(name)").eq("status", "inquiry").order("created_at", { ascending: false }).limit(5),
    db.from("ical_feeds").select("*, property:properties(id, name)").order("name"),
  ]);
  if (upcoming.error || requests.error || feeds.error) throw new Error("The dashboard could not be loaded.");

  type Row = Booking & { property: { name: string } };
  type FeedRow = IcalFeed & { property: { id: string; name: string } };
  const failing = (feeds.data as FeedRow[]).filter((f) => f.last_status === "error");

  return (
    <>
      <PageTitle title="Overview" />
      {isDemoMode() && <div className="mb-6"><Note tone="warning"><strong>Demo mode is on.</strong> The website shows “Preview site” and guests cannot book or pay. Set DEMO_MODE=false to go live.</Note></div>}
      {!isDemoMode() && !paymentsEnabled() && (
        <div className="mb-6">
          <Note>
            <strong>Online payment is off.</strong> Every home takes booking <em>requests</em>: guests send their dates, you get an email and reply to confirm. Requests do not block the calendar — block the dates yourself once you accept. Add your Stripe keys (STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET) in Vercel to switch on instant booking with card payment.
          </Note>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Upcoming stays" description={<Link href="/admin/bookings" className="text-primary underline underline-offset-4">All bookings</Link>}>
          {upcoming.data.length === 0 ? <p className="text-sm text-ink-soft">No upcoming confirmed stays yet.</p> : (
            <ul className="divide-y divide-line">
              {(upcoming.data as Row[]).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium text-ink">{b.guest_name} · {b.property.name}</p>
                    <p className="text-ink-soft">{formatDate(b.check_in)} → {formatDate(b.check_out)} · {b.reference}</p>
                  </div>
                  <p className="font-medium tabular-nums text-ink">{formatMoney(b.total_cents, { currency: b.currency })}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="New requests" description="Requests from inquiry-only properties. Reply to the guest by email.">
          {requests.data.length === 0 ? <p className="text-sm text-ink-soft">No open requests.</p> : (
            <ul className="divide-y divide-line">
              {(requests.data as Row[]).map((b) => (
                <li key={b.id} className="py-3 text-sm">
                  <p className="flex items-center gap-2 font-medium text-ink">{b.guest_name} · {b.property.name} <StatusBadge status={b.status} /></p>
                  <p className="text-ink-soft">{formatDate(b.check_in)} → {formatDate(b.check_out)} · <a className="underline" href={`mailto:${b.guest_email}`}>{b.guest_email}</a></p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="lg:col-span-2">
          <Panel title="Calendar sync" description="Imported calendars from Airbnb, Vrbo and Booking.com refresh automatically on a schedule; “Last synced” shows when each one was last read.">
            <Note tone="warning">
              <strong>Keep buffer days on.</strong> Airbnb and Vrbo only re-read your export calendar on their own schedule — it can take from 30 minutes to several hours — so a booking made here is not blocked there instantly. A buffer day on each property, and a minimum advance notice, greatly reduce the chance of a double booking.
            </Note>
            {failing.length > 0 && (
              <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {failing.length} calendar{failing.length === 1 ? " is" : "s are"} failing to import. Dates already imported stay blocked. Check the link{failing.length === 1 ? "" : "s"} below.
              </p>
            )}
            {feeds.data.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">No calendars connected yet. Open a property and add its Airbnb or Vrbo calendar link.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {(feeds.data as FeedRow[]).map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <p className="font-medium text-ink">
                      <Link href={`/admin/properties/${f.property.id}#calendars`} className="underline underline-offset-4">{f.property.name}</Link> · {f.name}
                    </p>
                    <p className={f.last_status === "error" ? "text-danger" : "text-ink-soft"}>
                      {f.last_synced_at ? `Last synced ${formatDateTime(f.last_synced_at)}` : "Not synced yet"}
                      {f.last_status === "error" ? ` — failed: ${f.last_error}` : f.last_event_count !== null ? ` · ${f.last_event_count} blocked stays` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={syncNow} className="mt-4">
              <SubmitButton variant="outline" pendingText="Syncing…">Sync all calendars now</SubmitButton>
            </ActionForm>
          </Panel>
        </div>
      </div>
    </>
  );
}
