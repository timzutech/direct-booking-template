import ical from "node-ical";
import { addDays, isIsoDate } from "@/lib/dates";

/** UID suffix of events in our own export feed (used to ignore our own events if a platform echoes them back). */
export const EXPORT_UID_SUFFIX = "@direct-booking";

export type ImportedEvent = { start: string; end: string; uid: string | null; summary: string | null };

type IcalDate = Date & { dateOnly?: boolean; tz?: string };

/** The calendar date of an iCal value, without shifting it across timezones. */
function toDateString(value: IcalDate, fallbackTimeZone: string): string {
  if (value.dateOnly) {
    // All-day values are built by node-ical in the process's local time.
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  // Timed values: use the event's own timezone when it has one.
  let timeZone = value.tz && value.tz !== "Etc/UTC" ? value.tz : fallbackTimeZone;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
  } catch {
    timeZone = fallbackTimeZone;
  }
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

/**
 * Parses an iCal feed (Airbnb, Vrbo, Booking.com…) into blocked date ranges.
 * `end` is exclusive, matching how these platforms export stays (DTEND = checkout day).
 * Throws if the text is not an iCal calendar, so a broken response never wipes existing blocks.
 */
export function parseIcalFeed(text: string, options: { timeZone: string; dropBefore?: string }): ImportedEvent[] {
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    throw new Error("The response is not an iCal calendar (BEGIN:VCALENDAR not found).");
  }
  const parsed = ical.sync.parseICS(text);
  const events: ImportedEvent[] = [];

  for (const item of Object.values(parsed)) {
    if (!item || item.type !== "VEVENT") continue;
    const event = item as unknown as { start?: IcalDate; end?: IcalDate; uid?: unknown; summary?: unknown; status?: string };
    if (!event.start || Number.isNaN(event.start.getTime())) continue;
    if (String(event.status ?? "").toUpperCase() === "CANCELLED") continue;

    const uid = typeof event.uid === "string" ? event.uid : null;
    if (uid?.endsWith(EXPORT_UID_SUFFIX)) continue; // our own export, echoed back

    const start = toDateString(event.start, options.timeZone);
    let end = event.end && !Number.isNaN(event.end.getTime()) ? toDateString(event.end, options.timeZone) : addDays(start, 1);
    if (end <= start) end = addDays(start, 1);
    if (!isIsoDate(start) || !isIsoDate(end)) continue;
    if (options.dropBefore && end <= options.dropBefore) continue; // already in the past

    const summary =
      typeof event.summary === "string" ? event.summary : ((event.summary as { val?: string } | undefined)?.val ?? null);
    events.push({ start, end, uid, summary: summary ? summary.slice(0, 200) : null });
  }
  return events.sort((a, b) => a.start.localeCompare(b.start));
}
