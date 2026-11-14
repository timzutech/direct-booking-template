import { NextResponse } from "next/server";
import { siteConfig } from "../../../../../site.config";
import { todayInTimezone } from "@/lib/dates";
import { publicClient } from "@/lib/supabase/public";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Live availability for the booking calendar. Returns unavailable date ranges
 * only (buffers applied, no guest data). Never cached.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/availability/[propertyId]">) {
  const { propertyId } = await params;
  if (!UUID.test(propertyId)) {
    return NextResponse.json({ error: "Unknown property." }, { status: 404 });
  }

  const { data, error } = await publicClient().rpc("get_public_unavailable_ranges", { p_property_id: propertyId });
  if (error) {
    console.error(`[availability] ${error.message}`);
    return NextResponse.json({ error: "Availability could not be loaded." }, { status: 500 });
  }

  return NextResponse.json(
    {
      today: todayInTimezone(siteConfig.timezone),
      ranges: (data as { start_date: string; end_date: string }[]).map((r) => ({ start: r.start_date, end: r.end_date })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
