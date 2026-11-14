import { siteConfig } from "../../../../../site.config";
import { addDays } from "@/lib/dates";
import { buildIcalFeed, type ExportEvent } from "@/lib/ical/export";
import { serviceClient } from "@/lib/supabase/service";

const FILE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.ics$/i;

/**
 * Export feed: /api/ical/<propertyId>.ics
 * Contains confirmed direct bookings (with the property's buffer days) and
 * manual blocks. Imported Airbnb/Vrbo blocks are deliberately left out so
 * calendars never echo each other's events back and forth.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/ical/[file]">) {
  const match = FILE.exec((await params).file);
  if (!match) return new Response("Not found", { status: 404 });
  const propertyId = match[1];
  const db = serviceClient();

  const { data: property, error: propertyError } = await db
    .from("properties")
    .select("id, name, buffer_days")
    .eq("id", propertyId)
    .maybeSingle();
  if (propertyError) return new Response("Calendar temporarily unavailable", { status: 500 });
  if (!property) return new Response("Not found", { status: 404 });

  const [bookings, blocks] = await Promise.all([
    db.from("bookings").select("id, check_in, check_out").eq("property_id", propertyId).eq("status", "confirmed"),
    db.from("blocked_dates").select("id, start_date, end_date").eq("property_id", propertyId).eq("source", "manual"),
  ]);
  if (bookings.error || blocks.error) return new Response("Calendar temporarily unavailable", { status: 500 });

  const events: ExportEvent[] = [
    ...bookings.data.map((b) => ({
      id: `booking-${b.id}`,
      start: addDays(b.check_in, -property.buffer_days),
      end: addDays(b.check_out, property.buffer_days),
      summary: `Reserved (${siteConfig.shortName})`,
    })),
    ...blocks.data.map((b) => ({ id: `block-${b.id}`, start: b.start_date, end: b.end_date, summary: "Not available" })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  return new Response(buildIcalFeed(`${property.name} — ${siteConfig.shortName}`, events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${propertyId}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
