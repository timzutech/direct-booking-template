import { cacheLife, cacheTag } from "next/cache";
import { siteConfig } from "../../site.config";
import { paymentsEnabled } from "@/lib/env";
import { publicClient } from "@/lib/supabase/public";
import type {
  Amenity, ContentKey, GuideItem, PricingRule, PropertyFull, PropertyPhoto, PropertyWithPhotos, Testimonial,
} from "@/lib/types";

/**
 * Cached reads of published content (uses the public key, so RLS applies).
 * Everything is tagged "content"; admin actions call updateTag("content")
 * so edits show up immediately. Otherwise entries refresh every minute.
 */
export const CONTENT_TAG = "content";

function fail(what: string, message: string): never {
  throw new Error(`Could not load ${what}: ${message}`);
}

const byOrder = (a: PropertyPhoto, b: PropertyPhoto) => a.sort_order - b.sort_order;

/** Without Stripe keys every home is shown and handled as "request to book". */
const requestOnly = <T extends { inquiry_only: boolean }>(p: T): T =>
  paymentsEnabled() ? p : { ...p, inquiry_only: true };

export async function getProperties(): Promise<PropertyWithPhotos[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CONTENT_TAG);
  const { data, error } = await publicClient()
    .from("properties")
    .select("*, photos:property_photos(*)")
    .eq("is_published", true)
    .order("sort_order")
    .order("name");
  if (error) fail("properties", error.message);
  return (data as PropertyWithPhotos[]).map((p) => requestOnly({ ...p, photos: [...p.photos].sort(byOrder) }));
}

export async function getPropertyBySlug(slug: string): Promise<PropertyFull | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CONTENT_TAG);
  const { data, error } = await publicClient()
    .from("properties")
    .select("*, photos:property_photos(*), property_amenities(amenity:amenities(*)), pricing_rules(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) fail("the property", error.message);
  if (!data) return null;
  const { property_amenities, ...rest } = data as PropertyWithPhotos & {
    property_amenities: { amenity: Amenity }[];
    pricing_rules: PricingRule[];
  };
  return requestOnly({
    ...rest,
    photos: [...rest.photos].sort(byOrder),
    amenities: property_amenities.map((pa) => pa.amenity).sort((a, b) => a.sort_order - b.sort_order),
  });
}

export async function getTestimonials(): Promise<Testimonial[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CONTENT_TAG);
  const { data, error } = await publicClient()
    .from("testimonials")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  if (error) fail("testimonials", error.message);
  return data as Testimonial[];
}

export async function getGuideItems(): Promise<GuideItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CONTENT_TAG);
  const { data, error } = await publicClient()
    .from("guide_items")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  if (error) fail("the local guide", error.message);
  return data as GuideItem[];
}

/** Defaults from site.config.ts for each editable text block. */
export const contentDefaults: Record<ContentKey, string> = {
  cancellation_policy: siteConfig.policies.cancellation,
  house_rules: siteConfig.policies.houseRules,
  terms: siteConfig.policies.terms,
  privacy: siteConfig.policies.privacy,
  about: siteConfig.about,
};

/** Editable text blocks: database overrides win, site.config.ts is the fallback. */
export async function getContent(): Promise<Record<ContentKey, string>> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CONTENT_TAG);
  const { data, error } = await publicClient().from("site_content").select("key, value");
  if (error) fail("site content", error.message);
  const merged = { ...contentDefaults };
  for (const row of data ?? []) {
    if (row.key in merged && row.value.trim()) merged[row.key as ContentKey] = row.value;
  }
  return merged;
}
