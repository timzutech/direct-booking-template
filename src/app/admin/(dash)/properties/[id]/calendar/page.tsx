import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig } from "../../../../../../../site.config";
import { syncNow } from "../../../../actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { AdminCalendar, type CalendarDay, type ManualBlock } from "@/components/admin/admin-calendar";
import { Note, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { addDays, addMonths, dayOfWeek, daysInMonth, startOfMonth, todayInTimezone, toUtc } from "@/lib/dates";
import { formatDateTime } from "@/lib/format";
import type { BlockedDate, Booking, IcalFeed } from "@/lib/types";

export const metadata: Metadata = { title: "Calendar" };

const UUID = /^[0-9a-f-]{36}$/i;
const monthFmt = new Intl.DateTimeFormat(siteConfig.locale, { month: "long", year: "numeric", timeZone: "UTC" });
const weekdayFmt = new Intl.DateTimeFormat(siteConfig.locale, { weekday: "short", timeZone: "UTC" });

/** Confirmed bookings, and pending ones whose 30-minute hold has not run out. */
function holdsDates(b: Booking): boolean {
  return b.status === "confirmed" || (b.expires_at !== null && new Date(b.expires_at).getTime() > Date.now());
}

export default async function PropertyCalendarPage({ params, searchParams }: PageProps<"/admin/properties/[id]/calendar">) {
  const { db } = await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const today = todayInTimezone(siteConfig.timezone);
  const requested = (await searchParams).month;
  const month = typeof requested === "string" && /^\d{4}-\d{2}$/.test(requested) ? `${requested}-01` : startOfMonth(today);
  const monthEnd = addMonths(month, 1); // exclusive

  const [property, bookings, blocks, feeds] = await Promise.all([
    db.from("properties").select("id, name, buffer_days").eq("id", id).maybeSingle(),
    db.from("bookings").select("*").eq("property_id", id).in("status", ["confirmed", "pending"]).lt("check_in", monthEnd).gt("check_out", month),
    db.from("blocked_dates").select("*").eq("property_id", id).lt("start_date", monthEnd).gt("end_date", month),
    db.from("ical_feeds").select("*").eq("property_id", id).order("created_at"),
  ]);
  if (property.error || bookings.error || blocks.error || feeds.error) throw new Error("The calendar could not be loaded.");
  if (!property.data) notFound();

  const feedNames = new Map((feeds.data as IcalFeed[]).map((f) => [f.id, f.name]));
  const active = (bookings.data as Booking[]).filter(holdsDates);
  const allBlocks = blocks.data as BlockedDate[];

  const days: CalendarDay[] = Array.from({ length: daysInMonth(month) }, (_, i) => {
    const date = addDays(month, i);
    const past = date < today;
    const booking = active.find((b) => b.check_in <= date && date < b.check_out);
    if (booking) {
      return { date, past, blockId: null, kind: booking.status === "confirmed" ? "booking" : "pending", label: `${booking.guest_name} (${booking.reference})` };
    }
    const imported = allBlocks.find((b) => b.source === "ical" && b.start_date <= date && date < b.end_date);
    if (imported) {
      return { date, past, blockId: null, kind: "ical", label: feedNames.get(imported.feed_id ?? "") ?? "Imported" };
    }
    const manual = allBlocks.find((b) => b.source === "manual" && b.start_date <= date && date < b.end_date);
    if (manual) return { date, past, blockId: manual.id, kind: "manual", label: manual.summary ?? "Blocked" };
    return { date, past, blockId: null, kind: "free", label: null };
  });

  const manualBlocks: ManualBlock[] = allBlocks
    .filter((b) => b.source === "manual")
    .map((b) => ({ id: b.id, first: b.start_date, last: addDays(b.end_date, -1), summary: b.summary }));
  const weekdays = Array.from({ length: 7 }, (_, i) => weekdayFmt.format(new Date(Date.UTC(2023, 0, 1 + i))));
  const monthParam = (iso: string) => iso.slice(0, 7);
  const lastSync = (feeds.data as IcalFeed[]).map((f) => f.last_synced_at).filter(Boolean).sort().at(-1);

  return (
    <div className="space-y-6">
      <PageTitle title={`${property.data.name} — calendar`}>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
          <Link href={`/admin/properties/${id}`} className="text-primary underline underline-offset-4">Edit property</Link>
          <Link href={`/admin/properties/${id}#calendars`} className="text-primary underline underline-offset-4">Calendar links</Link>
        </div>
      </PageTitle>

      <Note tone="warning">
        Airbnb and Vrbo refresh imported calendars on their own schedule (30 minutes to several hours), so changes here do not appear there instantly. Keeping buffer days on (currently {property.data.buffer_days}) is recommended.
      </Note>

      <div className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href={`?month=${monthParam(addMonths(month, -1))}`} className="btn-outline px-4" aria-label="Previous month">←</Link>
            <h2 className="min-w-44 text-center text-2xl font-semibold text-ink" aria-live="polite">{monthFmt.format(toUtc(month))}</h2>
            <Link href={`?month=${monthParam(addMonths(month, 1))}`} className="btn-outline px-4" aria-label="Next month">→</Link>
            <Link href="?" className="ml-2 text-sm text-primary underline underline-offset-4">Today</Link>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
            <span>{feeds.data.length === 0 ? "No calendars connected" : lastSync ? `Last synced ${formatDateTime(lastSync)}` : "Not synced yet"}</span>
            {feeds.data.length > 0 && (
              <ActionForm action={syncNow}>
                <input type="hidden" name="property_id" value={id} />
                <SubmitButton variant="outline" pendingText="Syncing…">Sync now</SubmitButton>
              </ActionForm>
            )}
          </div>
        </div>
        <AdminCalendar key={month} propertyId={id} days={days} leadingBlanks={dayOfWeek(month)} weekdays={weekdays} manualBlocks={manualBlocks} />
      </div>
    </div>
  );
}
