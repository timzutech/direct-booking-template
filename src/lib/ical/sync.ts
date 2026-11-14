import "server-only";
import { siteConfig } from "../../../site.config";
import { addDays, todayInTimezone } from "@/lib/dates";
import { parseIcalFeed } from "@/lib/ical/parse";
import { serviceClient } from "@/lib/supabase/service";
import type { IcalFeed } from "@/lib/types";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 3_000_000;

export type FeedSyncResult = { feedId: string; name: string; propertyId: string; ok: boolean; events?: number; error?: string };

async function downloadFeed(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url.trim().replace(/^webcal:/i, "https:"));
  } catch {
    throw new Error("The feed URL is not a valid URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("The feed URL must start with https://");
  }
  const response = await fetch(parsed, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "DirectBookingCalendarSync/1.0", Accept: "text/calendar, text/plain, */*" },
  });
  if (!response.ok) throw new Error(`The calendar server answered with HTTP ${response.status}.`);
  const text = await response.text();
  if (text.length > MAX_BYTES) throw new Error("The calendar file is too large.");
  return text;
}

/**
 * Imports one feed and replaces its blocks in a single transaction.
 * If anything fails (network, bad file) the previous blocks are kept and the
 * error is recorded on the feed, so a temporary outage never opens up dates.
 */
export async function syncFeed(feed: Pick<IcalFeed, "id" | "name" | "url" | "property_id">): Promise<FeedSyncResult> {
  const db = serviceClient();
  const base = { feedId: feed.id, name: feed.name, propertyId: feed.property_id };
  try {
    const text = await downloadFeed(feed.url);
    const today = todayInTimezone(siteConfig.timezone);
    const events = parseIcalFeed(text, { timeZone: siteConfig.timezone, dropBefore: addDays(today, -1) });
    const { data, error } = await db.rpc("replace_feed_blocks", { p_feed_id: feed.id, p_events: events });
    if (error) throw new Error(error.message);
    return { ...base, ok: true, events: data as number };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "TimeoutError" ? "The calendar server took too long to respond." : err.message
        : "Unknown error";
    await db
      .from("ical_feeds")
      .update({ last_synced_at: new Date().toISOString(), last_status: "error", last_error: message.slice(0, 500) })
      .eq("id", feed.id);
    return { ...base, ok: false, error: message };
  }
}

/** Syncs every feed (optionally only one property's). Feeds are fetched a few at a time. */
export async function syncFeeds(propertyId?: string): Promise<FeedSyncResult[]> {
  let query = serviceClient().from("ical_feeds").select("id, name, url, property_id").order("created_at");
  if (propertyId) query = query.eq("property_id", propertyId);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load calendar feeds: ${error.message}`);

  const feeds = data as Pick<IcalFeed, "id" | "name" | "url" | "property_id">[];
  const results: FeedSyncResult[] = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < feeds.length; i += CONCURRENCY) {
    results.push(...(await Promise.all(feeds.slice(i, i + CONCURRENCY).map(syncFeed))));
  }
  return results;
}
