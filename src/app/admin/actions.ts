"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import {
  checked, decimal, done, failed, integer, money, optionalText, slugify, text, type ActionState,
} from "@/lib/admin/form";
import { contentDefaults, CONTENT_TAG } from "@/lib/data";
import { isIsoDate } from "@/lib/dates";
import { syncFeeds } from "@/lib/ical/sync";
import type { ContentKey, SleepingArrangement } from "@/lib/types";

/**
 * All dashboard mutations. Each action re-checks that the caller is an admin;
 * writes use the host's own session, so Row Level Security is the final guard.
 */

function refresh(...paths: string[]) {
  updateTag(CONTENT_TAG); // public pages show the change immediately
  for (const path of paths) revalidatePath(path);
}

const dbError = (what: string, message: string) => failed(`Could not ${what}: ${message}`);

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

function parseSleeping(raw: string): SleepingArrangement[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [room, ...rest] = line.split(":");
      return rest.length ? { room: room.trim(), beds: rest.join(":").trim() } : { room: line, beds: "" };
    });
}

export async function saveProperty(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = optionalText(form, "id");

  const name = text(form, "name");
  if (name.length < 2) return failed("Please give the property a name.");
  const slug = slugify(text(form, "slug") || name);
  if (!slug) return failed("Please enter a URL name using letters and numbers.");

  const basePrice = money(form, "base_price");
  if (basePrice === null) return failed("Please enter the nightly price.");
  const minNights = Math.max(1, integer(form, "min_nights", 1));
  const maxNights = Math.max(minNights, integer(form, "max_nights", 30));
  const weekendDays = form.getAll("weekend_days").map(Number).filter((n) => n >= 0 && n <= 6);
  const taxRate = decimal(form, "tax_rate_percent") ?? 0;
  if (taxRate < 0 || taxRate > 100) return failed("The tax rate must be between 0 and 100.");
  const latitude = decimal(form, "latitude");
  const longitude = decimal(form, "longitude");
  if ((latitude !== null && Math.abs(latitude) > 90) || (longitude !== null && Math.abs(longitude) > 180)) {
    return failed("Latitude must be between -90 and 90, longitude between -180 and 180.");
  }

  const row = {
    name,
    slug,
    tagline: optionalText(form, "tagline"),
    description: text(form, "description"),
    location_label: text(form, "location_label"),
    address: optionalText(form, "address"),
    latitude,
    longitude,
    max_guests: Math.max(1, integer(form, "max_guests", 2)),
    bedrooms: Math.max(0, integer(form, "bedrooms", 1)),
    beds: Math.max(0, integer(form, "beds", 1)),
    bathrooms: Math.max(0, decimal(form, "bathrooms") ?? 1),
    sleeping_arrangements: parseSleeping(text(form, "sleeping_arrangements")),
    house_rules: optionalText(form, "house_rules"),
    base_price_cents: basePrice,
    weekend_price_cents: money(form, "weekend_price"),
    weekend_days: weekendDays,
    cleaning_fee_cents: money(form, "cleaning_fee") ?? 0,
    pets_allowed: checked(form, "pets_allowed"),
    pet_fee_cents: money(form, "pet_fee") ?? 0,
    tax_rate_percent: taxRate,
    min_nights: minNights,
    max_nights: maxNights,
    booking_window_days: Math.max(1, integer(form, "booking_window_days", 365)),
    min_advance_days: Math.max(0, integer(form, "min_advance_days", 1)),
    buffer_days: Math.max(0, integer(form, "buffer_days", 0)),
    inquiry_only: checked(form, "inquiry_only"),
    check_in_time: optionalText(form, "check_in_time"),
    check_out_time: optionalText(form, "check_out_time"),
    is_published: checked(form, "is_published"),
    is_featured: checked(form, "is_featured"),
    sort_order: integer(form, "sort_order", 0),
  };

  if (!id) {
    const { data, error } = await db.from("properties").insert(row).select("id").single();
    if (error) {
      return error.code === "23505" ? failed("Another property already uses that URL name.") : dbError("create the property", error.message);
    }
    refresh("/admin/properties");
    redirect(`/admin/properties/${data.id}?created=1`);
  }

  const { error } = await db.from("properties").update(row).eq("id", id);
  if (error) {
    return error.code === "23505" ? failed("Another property already uses that URL name.") : dbError("save the property", error.message);
  }

  // Amenities: replace the property's selection.
  const amenityIds = form.getAll("amenities").map(String);
  const { error: clearError } = await db.from("property_amenities").delete().eq("property_id", id);
  if (clearError) return dbError("update amenities", clearError.message);
  if (amenityIds.length > 0) {
    const { error: linkError } = await db
      .from("property_amenities")
      .insert(amenityIds.map((amenity_id) => ({ property_id: id, amenity_id })));
    if (linkError) return dbError("update amenities", linkError.message);
  }

  refresh("/admin/properties", `/admin/properties/${id}`);
  return done("Property saved.");
}

export async function deleteProperty(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = text(form, "id");

  const { data: photos } = await db.from("property_photos").select("storage_path").eq("property_id", id);
  const { error } = await db.from("properties").delete().eq("id", id);
  if (error) {
    return error.code === "23503"
      ? failed("This property has bookings, so it cannot be deleted. Unpublish it instead to hide it from the website.")
      : dbError("delete the property", error.message);
  }
  const paths = (photos ?? []).map((p) => p.storage_path).filter((p): p is string => !!p);
  if (paths.length > 0) await db.storage.from("property-photos").remove(paths);

  refresh("/admin/properties");
  redirect("/admin/properties?deleted=1");
}

export async function addAmenity(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const name = text(form, "name");
  if (name.length < 2) return failed("Please enter the amenity name.");
  const { error } = await db.from("amenities").insert({
    name,
    category: text(form, "category") || "General",
    icon: text(form, "icon") || "check",
    sort_order: 999,
  });
  if (error) return error.code === "23505" ? failed("That amenity already exists.") : dbError("add the amenity", error.message);
  refresh(`/admin/properties/${text(form, "property_id")}`);
  return done(`Added “${name}”. Tick it above and save the property.`);
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export async function addPhoto(input: { propertyId: string; storagePath: string; url: string; alt: string }): Promise<ActionState> {
  const { db } = await requireAdmin();
  const { data: last } = await db
    .from("property_photos")
    .select("sort_order")
    .eq("property_id", input.propertyId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const { error } = await db.from("property_photos").insert({
    property_id: input.propertyId,
    storage_path: input.storagePath,
    url: input.url,
    alt: input.alt.slice(0, 200),
    sort_order: (last?.[0]?.sort_order ?? -1) + 1,
  });
  if (error) return dbError("save the photo", error.message);
  refresh(`/admin/properties/${input.propertyId}`);
  return done("Photo added.");
}

export async function updatePhotoAlt(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const { error } = await db.from("property_photos").update({ alt: text(form, "alt").slice(0, 200) }).eq("id", text(form, "id"));
  if (error) return dbError("save the description", error.message);
  refresh(`/admin/properties/${text(form, "property_id")}`);
  return done("Description saved.");
}

export async function movePhoto(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const propertyId = text(form, "property_id");
  const id = text(form, "id");
  const direction = text(form, "direction") === "up" ? -1 : 1;

  const { data: photos, error } = await db
    .from("property_photos")
    .select("id")
    .eq("property_id", propertyId)
    .order("sort_order")
    .order("created_at");
  if (error) return dbError("reorder photos", error.message);

  const ids = photos.map((p) => p.id as string);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  [ids[from], ids[to]] = [ids[to], ids[from]];

  const results = await Promise.all(ids.map((photoId, i) => db.from("property_photos").update({ sort_order: i }).eq("id", photoId)));
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) return dbError("reorder photos", firstError.message);
  refresh(`/admin/properties/${propertyId}`);
  return null;
}

export async function deletePhoto(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = text(form, "id");
  const { data: photo } = await db.from("property_photos").select("storage_path").eq("id", id).maybeSingle();
  const { error } = await db.from("property_photos").delete().eq("id", id);
  if (error) return dbError("delete the photo", error.message);
  if (photo?.storage_path) await db.storage.from("property-photos").remove([photo.storage_path]);
  refresh(`/admin/properties/${text(form, "property_id")}`);
  return done("Photo deleted.");
}

// ---------------------------------------------------------------------------
// Seasonal pricing
// ---------------------------------------------------------------------------

export async function addPricingRule(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const propertyId = text(form, "property_id");
  const start = text(form, "start_date");
  const end = text(form, "end_date");
  const nightly = money(form, "nightly_price");
  if (!text(form, "name")) return failed("Please name this price period (for example “Summer”).");
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) return failed("Please choose a valid first and last night.");
  if (nightly === null) return failed("Please enter the nightly price for this period.");

  const minNights = text(form, "min_nights") ? Math.max(1, integer(form, "min_nights", 1)) : null;
  const { error } = await db.from("pricing_rules").insert({
    property_id: propertyId,
    name: text(form, "name"),
    start_date: start,
    end_date: end,
    nightly_price_cents: nightly,
    weekend_price_cents: money(form, "weekend_price"),
    min_nights: minNights,
    priority: integer(form, "priority", 0),
  });
  if (error) return dbError("add the price period", error.message);
  refresh(`/admin/properties/${propertyId}`);
  return done("Price period added.");
}

export async function deletePricingRule(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const { error } = await db.from("pricing_rules").delete().eq("id", text(form, "id"));
  if (error) return dbError("delete the price period", error.message);
  refresh(`/admin/properties/${text(form, "property_id")}`);
  return done("Price period deleted.");
}

// ---------------------------------------------------------------------------
// Calendar: iCal feeds and manual blocks
// ---------------------------------------------------------------------------

export async function addIcalFeed(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const propertyId = text(form, "property_id");
  const name = text(form, "name");
  const url = text(form, "url").replace(/^webcal:/i, "https:");
  if (!name) return failed("Please name the calendar (for example “Airbnb”).");
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return failed("Please paste the full calendar link, starting with https://");
  }

  const { error } = await db.from("ical_feeds").insert({ property_id: propertyId, name, url });
  if (error) return dbError("add the calendar", error.message);

  const results = await syncFeeds(propertyId);
  refresh(`/admin/properties/${propertyId}`, `/admin/properties/${propertyId}/calendar`);
  const mine = results.find((r) => r.name === name && !r.ok);
  return mine
    ? failed(`Calendar added, but the first import failed: ${mine.error}`)
    : done("Calendar added and imported.");
}

export async function deleteIcalFeed(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const propertyId = text(form, "property_id");
  // Imported blocks belonging to the feed are removed with it (ON DELETE CASCADE).
  const { error } = await db.from("ical_feeds").delete().eq("id", text(form, "id"));
  if (error) return dbError("remove the calendar", error.message);
  refresh(`/admin/properties/${propertyId}`, `/admin/properties/${propertyId}/calendar`);
  return done("Calendar removed, and its imported dates were unblocked.");
}

export async function syncNow(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const propertyId = optionalText(form, "property_id") ?? undefined;
  try {
    const results = await syncFeeds(propertyId);
    refresh("/admin", "/admin/properties");
    if (propertyId) refresh(`/admin/properties/${propertyId}`, `/admin/properties/${propertyId}/calendar`);
    if (results.length === 0) return done("There are no calendars to sync yet.");
    const bad = results.filter((r) => !r.ok);
    return bad.length === 0
      ? done(`Synced ${results.length} calendar${results.length === 1 ? "" : "s"}.`)
      : failed(`${bad.length} of ${results.length} calendars failed: ${bad.map((b) => `${b.name} — ${b.error}`).join("; ")}`);
  } catch (err) {
    return failed(err instanceof Error ? err.message : "Sync failed.");
  }
}

export async function blockDates(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const propertyId = text(form, "property_id");
  const from = text(form, "from");
  const to = text(form, "to") || from; // last blocked night (inclusive)
  if (!isIsoDate(from) || !isIsoDate(to) || to < from) return failed("Please choose a valid first and last night to block.");

  const end = new Date(`${to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const { error } = await db.from("blocked_dates").insert({
    property_id: propertyId,
    start_date: from,
    end_date: end.toISOString().slice(0, 10),
    source: "manual",
    summary: optionalText(form, "summary"),
  });
  if (error) return dbError("block the dates", error.message);
  refresh(`/admin/properties/${propertyId}/calendar`);
  return done("Dates blocked.");
}

export async function unblockDates(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const propertyId = text(form, "property_id");
  const { error } = await db.from("blocked_dates").delete().eq("id", text(form, "id")).eq("source", "manual");
  if (error) return dbError("unblock the dates", error.message);
  refresh(`/admin/properties/${propertyId}/calendar`);
  return done("Dates unblocked.");
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function updateBooking(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = text(form, "id");
  const intent = text(form, "intent");

  if (intent === "notes") {
    const { error } = await db.from("bookings").update({ notes: optionalText(form, "notes") }).eq("id", id);
    if (error) return dbError("save the note", error.message);
    refresh("/admin/bookings");
    return done("Note saved.");
  }

  const transitions: Record<string, { from: string[]; to: string; message: string }> = {
    cancel: { from: ["confirmed", "pending"], to: "cancelled", message: "Booking cancelled and dates released. Refunds are made in your Stripe dashboard." },
    decline: { from: ["inquiry"], to: "declined", message: "Request marked as declined." },
  };
  const change = transitions[intent];
  if (!change) return failed("Unknown action.");

  const { data, error } = await db
    .from("bookings")
    .update({ status: change.to, expires_at: null })
    .eq("id", id)
    .in("status", change.from)
    .select("id");
  if (error) return dbError("update the booking", error.message);
  if (data.length === 0) return failed("This booking has already changed status. Refresh the page to see the latest.");
  refresh("/admin/bookings", "/admin");
  return done(change.message);
}

// ---------------------------------------------------------------------------
// Testimonials, local guide, policies
// ---------------------------------------------------------------------------

export async function saveTestimonial(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = optionalText(form, "id");
  const row = {
    guest_name: text(form, "guest_name"),
    guest_location: optionalText(form, "guest_location"),
    quote: text(form, "quote"),
    rating: Math.min(5, Math.max(1, integer(form, "rating", 5))),
    stay_label: optionalText(form, "stay_label"),
    is_published: checked(form, "is_published"),
    sort_order: integer(form, "sort_order", 0),
  };
  if (!row.guest_name || row.quote.length < 5) return failed("Please enter the guest’s name and their words.");
  const { error } = id ? await db.from("testimonials").update(row).eq("id", id) : await db.from("testimonials").insert(row);
  if (error) return dbError("save the testimonial", error.message);
  refresh("/admin/testimonials");
  return done(id ? "Testimonial saved." : "Testimonial added.");
}

export async function deleteTestimonial(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const { error } = await db.from("testimonials").delete().eq("id", text(form, "id"));
  if (error) return dbError("delete the testimonial", error.message);
  refresh("/admin/testimonials");
  return done("Testimonial deleted.");
}

export async function saveGuideItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = optionalText(form, "id");
  const category = text(form, "category");
  if (!["restaurant", "activity", "tip"].includes(category)) return failed("Please choose a section.");
  const url = optionalText(form, "url");
  if (url && !/^https?:\/\//i.test(url)) return failed("The website link must start with https://");
  const row = {
    category,
    title: text(form, "title"),
    description: text(form, "description"),
    address: optionalText(form, "address"),
    url,
    is_published: checked(form, "is_published"),
    sort_order: integer(form, "sort_order", 0),
  };
  if (!row.title) return failed("Please enter a title.");
  const { error } = id ? await db.from("guide_items").update(row).eq("id", id) : await db.from("guide_items").insert(row);
  if (error) return dbError("save the guide entry", error.message);
  refresh("/admin/guide");
  return done(id ? "Guide entry saved." : "Guide entry added.");
}

export async function deleteGuideItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const { error } = await db.from("guide_items").delete().eq("id", text(form, "id"));
  if (error) return dbError("delete the guide entry", error.message);
  refresh("/admin/guide");
  return done("Guide entry deleted.");
}

export async function saveContent(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const key = text(form, "key") as ContentKey;
  if (!(key in contentDefaults)) return failed("Unknown text block.");
  const value = text(form, "value");

  // An empty box means "go back to the default from site.config.ts".
  const { error } = value
    ? await db.from("site_content").upsert({ key, value })
    : await db.from("site_content").delete().eq("key", key);
  if (error) return dbError("save the text", error.message);
  refresh("/admin/policies");
  return done(value ? "Saved." : "Reset to the default text.");
}
