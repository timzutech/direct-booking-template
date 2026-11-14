import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { syncFeeds } from "@/lib/ical/sync";
import { serviceClient } from "@/lib/supabase/service";

export const maxDuration = 60;

/**
 * Scheduled job (see vercel.json): imports every iCal feed and tidies up
 * expired pending bookings. Vercel Cron authenticates with
 * "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: Request) {
  const secret = env.cronSecret;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { data: expired, error } = await serviceClient().rpc("expire_stale_bookings");
    if (error) console.error(`[cron] expire_stale_bookings failed: ${error.message}`);

    const results = await syncFeeds();
    const failed = results.filter((r) => !r.ok);
    for (const f of failed) console.error(`[cron] feed "${f.name}" (${f.feedId}) failed: ${f.error}`);

    return NextResponse.json({
      expiredBookings: expired ?? 0,
      feeds: results.length,
      synced: results.length - failed.length,
      failed: failed.map((f) => ({ feed: f.name, error: f.error })),
    });
  } catch (err) {
    console.error(`[cron] sync failed: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: "Calendar sync failed." }, { status: 500 });
  }
}
