/**
 * Demo seed: 3 sample properties with photos, amenities, seasonal pricing,
 * testimonials, a local guide and a few calendar blocks.
 *
 *   npm run seed            → seeds an empty database
 *   npm run seed -- --reset → DELETES all properties, bookings, guests and content first
 *
 * Photos: by default the seed links to sample photos hosted by Unsplash.
 * Set SEED_PHOTOS=local to use the offline placeholders in public/demo instead.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { addDays, format } from "date-fns";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const reset = process.argv.includes("--reset");
const localPhotos = process.env.SEED_PHOTOS === "local";

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=75`;
const day = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error || result.data === null) {
    console.error(`Seed failed while ${what}: ${result.error?.message ?? "no data returned"}`);
    process.exit(1);
  }
  return result.data;
}

const amenities = [
  { name: "Fast Wi-Fi", category: "Essentials", icon: "wifi" },
  { name: "Fully equipped kitchen", category: "Essentials", icon: "kitchen" },
  { name: "Washer & dryer", category: "Essentials", icon: "washer" },
  { name: "Free parking", category: "Essentials", icon: "parking" },
  { name: "Air conditioning", category: "Comfort", icon: "snowflake" },
  { name: "Heating", category: "Comfort", icon: "flame" },
  { name: "Wood-burning fireplace", category: "Comfort", icon: "flame" },
  { name: "Hot tub", category: "Outdoors", icon: "hot-tub" },
  { name: "Private dock", category: "Outdoors", icon: "water" },
  { name: "Kayaks & paddleboards", category: "Outdoors", icon: "water" },
  { name: "Fire pit", category: "Outdoors", icon: "flame" },
  { name: "BBQ grill", category: "Outdoors", icon: "grill" },
  { name: "Beach access", category: "Outdoors", icon: "water" },
  { name: "Outdoor shower", category: "Outdoors", icon: "water" },
  { name: "Balcony", category: "Outdoors", icon: "sun" },
  { name: "Dedicated workspace", category: "Extras", icon: "desk" },
  { name: "Smart TV", category: "Extras", icon: "tv" },
  { name: "Espresso machine", category: "Extras", icon: "coffee" },
  { name: "Pet friendly", category: "Extras", icon: "paw" },
  { name: "Crib & high chair", category: "Extras", icon: "baby" },
].map((a, i) => ({ ...a, sort_order: i }));

type SeedProperty = {
  row: Record<string, unknown>;
  photoKey: "lake" | "coast" | "city";
  photos: { id: string; alt: string }[];
  amenities: string[];
};

const properties: SeedProperty[] = [
  {
    photoKey: "lake",
    row: {
      slug: "heron-lake-cabin",
      name: "Heron Lake Cabin",
      tagline: "A cedar cabin on the water, built for unhurried weekends.",
      description: `Wake to mist on the lake and coffee on the dock. Heron Lake Cabin is a three-bedroom cedar retreat with a wall of windows, a wood-burning fireplace and a private dock with kayaks ready to go.

Evenings are for the fire pit and the hot tub under the pines. Inside, the kitchen is stocked for real cooking, the beds are dressed in linen, and there is fast Wi-Fi for the days you can't fully switch off.

The village, with its bakery and general store, is a ten-minute drive.`,
      location_label: "Lake Placid, New York",
      address: "14 Heron Point Road, Lake Placid, NY 12946",
      latitude: 44.2795,
      longitude: -73.9799,
      max_guests: 6,
      bedrooms: 3,
      beds: 4,
      bathrooms: 2,
      sleeping_arrangements: [
        { room: "Primary bedroom", beds: "1 king bed" },
        { room: "Lake room", beds: "1 queen bed" },
        { room: "Bunk room", beds: "2 twin beds" },
      ],
      base_price_cents: 28500,
      weekend_price_cents: 34500,
      cleaning_fee_cents: 15000,
      pets_allowed: true,
      pet_fee_cents: 7500,
      tax_rate_percent: 8,
      min_nights: 2,
      max_nights: 21,
      booking_window_days: 365,
      min_advance_days: 1,
      buffer_days: 1,
      is_published: true,
      is_featured: true,
      sort_order: 0,
    },
    photos: [
      { id: "1695668193703-cf6a2c6d784b", alt: "Cabin among the trees beside the lake" },
      { id: "1680703486830-1b5af60635d7", alt: "Living room with fireplace and deep sofas" },
      { id: "1664369058082-ee8e36028106", alt: "Sitting area with a couch beside the fireplace" },
      { id: "1697807713049-d171c4dd9d5e", alt: "Bright lounge with tall windows" },
      { id: "1785528266178-81cdec8eacf4", alt: "Bedroom with a large window looking over the lake" },
      { id: "1574514342513-f739e07c81cf", alt: "The house and shoreline at sunset" },
    ],
    amenities: [
      "Fast Wi-Fi", "Fully equipped kitchen", "Washer & dryer", "Free parking", "Heating",
      "Wood-burning fireplace", "Hot tub", "Private dock", "Kayaks & paddleboards", "Fire pit",
      "BBQ grill", "Smart TV", "Pet friendly",
    ],
  },
  {
    photoKey: "coast",
    row: {
      slug: "saltgrass-beach-house",
      name: "Saltgrass Beach House",
      tagline: "Barefoot days, a short boardwalk from the sand.",
      description: `Saltgrass is a breezy four-bedroom beach house with wide porches, an outdoor shower and a boardwalk that drops you on the sand in two minutes.

The open kitchen and long dining table are made for big family dinners. Upstairs, the primary suite has its own balcony facing the dunes; downstairs, a bunk room keeps the kids happy.

Beach chairs, umbrellas and a wagon are waiting in the shed — just bring swimsuits.`,
      location_label: "Tybee Island, Georgia",
      address: "7 Saltgrass Lane, Tybee Island, GA 31328",
      latitude: 32.0005,
      longitude: -80.8457,
      max_guests: 8,
      bedrooms: 4,
      beds: 6,
      bathrooms: 3,
      sleeping_arrangements: [
        { room: "Primary suite", beds: "1 king bed" },
        { room: "Dune room", beds: "1 queen bed" },
        { room: "Garden room", beds: "1 queen bed" },
        { room: "Bunk room", beds: "1 bunk bed, 1 twin bed" },
      ],
      base_price_cents: 39500,
      weekend_price_cents: 46500,
      cleaning_fee_cents: 22500,
      pets_allowed: false,
      pet_fee_cents: 0,
      tax_rate_percent: 13,
      min_nights: 3,
      max_nights: 28,
      booking_window_days: 365,
      min_advance_days: 2,
      buffer_days: 1,
      is_published: true,
      is_featured: true,
      sort_order: 1,
    },
    photos: [
      { id: "1730005523015-422bd53dda0b", alt: "View of the ocean from the beach house" },
      { id: "1726090401458-7abb00f7450c", alt: "Calm, neutral living room with a fireplace" },
      { id: "1770414173168-f6c666501225", alt: "Bright coastal bedroom with a large bed" },
      { id: "1726091097680-5da84f593ccd", alt: "Seating area filled with natural light" },
      { id: "1793891703633-0623d02dde98", alt: "Bedroom looking out to the beach and palms" },
      { id: "1574620845949-61a08a005988", alt: "The blue-painted house from the lane" },
    ],
    amenities: [
      "Fast Wi-Fi", "Fully equipped kitchen", "Washer & dryer", "Free parking", "Air conditioning",
      "Beach access", "Outdoor shower", "BBQ grill", "Balcony", "Smart TV", "Espresso machine",
      "Crib & high chair",
    ],
  },
  {
    photoKey: "city",
    row: {
      slug: "the-foundry-loft",
      name: "The Foundry Loft",
      tagline: "A light-filled loft in the old quarter — walk to everything.",
      description: `Once a printworks, now a calm one-bedroom loft with fourteen-foot ceilings, original timber beams and tall factory windows.

You are a five-minute walk from the squares, coffee shops and the riverfront, with a quiet courtyard to come home to. There is a proper desk for working stays and a kitchen you will actually want to cook in.

Stays at the Foundry Loft are by request — send us your dates and we will reply within a few hours.`,
      location_label: "Savannah, Georgia",
      address: "212 Foundry Row, Savannah, GA 31401",
      latitude: 32.0809,
      longitude: -81.0912,
      max_guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      sleeping_arrangements: [{ room: "Bedroom", beds: "1 queen bed" }],
      base_price_cents: 16500,
      weekend_price_cents: 19500,
      cleaning_fee_cents: 8500,
      pets_allowed: false,
      pet_fee_cents: 0,
      tax_rate_percent: 13,
      min_nights: 2,
      max_nights: 30,
      booking_window_days: 270,
      min_advance_days: 1,
      buffer_days: 0,
      inquiry_only: true,
      is_published: true,
      is_featured: true,
      sort_order: 2,
    },
    photos: [
      { id: "1783990349147-906f62b882c1", alt: "Open-plan loft with dining area and kitchen" },
      { id: "1617817643768-8855fc457e3a", alt: "Long wooden dining table in the loft" },
      { id: "1619989652700-9984844cb0ea", alt: "Living area with a warm, neutral palette" },
      { id: "1650137938625-11576502aecd", alt: "Lounge with tall windows and plants" },
      { id: "1738748444659-f8975b12ce57", alt: "Bedroom with built-in wardrobe" },
      { id: "1672082497059-1e6c0209eeeb", alt: "City view from the window at dusk" },
    ],
    amenities: [
      "Fast Wi-Fi", "Fully equipped kitchen", "Washer & dryer", "Air conditioning", "Heating",
      "Dedicated workspace", "Smart TV", "Espresso machine",
    ],
  },
];

const testimonials = [
  {
    guest_name: "Maya R.",
    guest_location: "Boston, MA",
    quote:
      "We have stayed in a lot of rentals and this was the first that felt like someone truly cared. The dock at sunrise was worth the drive alone.",
    rating: 5,
    stay_label: "Heron Lake Cabin",
    slug: "heron-lake-cabin",
  },
  {
    guest_name: "Daniel & Priya",
    guest_location: "Atlanta, GA",
    quote:
      "Booking direct was effortless and noticeably cheaper than the listing sites. The house was spotless and the beach gear saved us a car full of luggage.",
    rating: 5,
    stay_label: "Saltgrass Beach House",
    slug: "saltgrass-beach-house",
  },
  {
    guest_name: "Colette B.",
    guest_location: "Toronto, ON",
    quote:
      "A beautiful, quiet loft right in the middle of everything. The local guide sent us to the best dinner of our trip.",
    rating: 5,
    stay_label: "The Foundry Loft",
    slug: "the-foundry-loft",
  },
  {
    guest_name: "The Okafor family",
    guest_location: "Charlotte, NC",
    quote:
      "Our third stay and it will not be our last. Quick answers, thoughtful touches, and a fair price every time.",
    rating: 5,
    stay_label: "Returning guests",
    slug: null,
  },
];

const guide = [
  { category: "restaurant", title: "The Lantern Room", description: "Candlelit, seasonal and worth booking ahead. Ask for the corner table and order whatever the fish is.", address: "18 Main Street" },
  { category: "restaurant", title: "Marigold Bakery", description: "Cardamom buns out of the oven at 8am. They sell out by ten on weekends.", address: "3 Mill Lane" },
  { category: "restaurant", title: "Dockside Oyster Bar", description: "Paper-lined trays, cold drinks and the best sunset seats in town. No reservations.", address: "Harbor Walk" },
  { category: "activity", title: "Sunrise paddle", description: "The water is glass before 7am. Kayaks are at the house; head left along the shore to the heron rookery." },
  { category: "activity", title: "Ridge Trail loop", description: "A 4-mile loop with a big view for modest effort. Trailhead parking fills by 9am in summer.", address: "Ridge Road trailhead" },
  { category: "activity", title: "Saturday farmers' market", description: "Local cheese, flowers and peaches in season. 8am to noon, rain or shine.", address: "Town Square" },
  { category: "tip", title: "Groceries on the way in", description: "The last full supermarket is 20 minutes before you arrive — stock up there. The village store covers the basics." },
  { category: "tip", title: "Book dinner early", description: "In high season the good tables go a week or two ahead. Message us and we will happily make a reservation for you." },
  { category: "tip", title: "Pack a layer", description: "Evenings by the water cool down quickly, even in July. There are blankets in the chest by the door." },
];

async function main() {
  const existing = must(await db.from("properties").select("id").limit(1), "checking existing data");
  if (existing.length > 0 && !reset) {
    console.error(
      "The database already has properties. Run `npm run seed -- --reset` to wipe ALL properties, bookings, guests and content and reseed.",
    );
    process.exit(1);
  }

  if (reset) {
    console.log("Resetting demo data…");
    for (const table of ["bookings", "guests", "testimonials", "guide_items", "properties", "amenities"]) {
      const { error } = await db.from(table).delete().not("id", "is", null);
      if (error) {
        console.error(`Could not clear ${table}: ${error.message}`);
        process.exit(1);
      }
    }
  }

  const amenityRows = must(
    await db.from("amenities").upsert(amenities, { onConflict: "name" }).select("id, name"),
    "inserting amenities",
  );
  const amenityId = new Map(amenityRows.map((a) => [a.name as string, a.id as string]));

  const propertyIds = new Map<string, string>();
  for (const p of properties) {
    const created = must(await db.from("properties").insert(p.row).select("id").single(), `inserting ${p.row.name}`);
    const id = (created as unknown as { id: string }).id as string;
    propertyIds.set(p.row.slug as string, id);

    must(
      await db
        .from("property_photos")
        .insert(
          p.photos.map((photo, i) => ({
            property_id: id,
            url: localPhotos ? `/demo/${p.photoKey}-${i + 1}.svg` : unsplash(photo.id),
            alt: photo.alt,
            sort_order: i,
          })),
        )
        .select("id"),
      "inserting photos",
    );

    must(
      await db
        .from("property_amenities")
        .insert(p.amenities.map((name) => ({ property_id: id, amenity_id: amenityId.get(name)! })))
        .select("property_id"),
      "linking amenities",
    );
  }

  const lake = propertyIds.get("heron-lake-cabin")!;
  const coast = propertyIds.get("saltgrass-beach-house")!;
  const year = new Date().getFullYear();

  must(
    await db
      .from("pricing_rules")
      .insert([
        { property_id: lake, name: "Summer season", start_date: `${year + 1}-06-15`, end_date: `${year + 1}-09-05`, nightly_price_cents: 34500, weekend_price_cents: 39500, min_nights: 3, priority: 0 },
        { property_id: lake, name: "Holiday week", start_date: `${year}-12-20`, end_date: `${year + 1}-01-02`, nightly_price_cents: 39500, weekend_price_cents: null, min_nights: 4, priority: 10 },
        { property_id: coast, name: "Summer season", start_date: `${year + 1}-05-25`, end_date: `${year + 1}-08-31`, nightly_price_cents: 49500, weekend_price_cents: 55500, min_nights: 5, priority: 0 },
      ])
      .select("id"),
    "inserting pricing rules",
  );

  // A little calendar activity so the demo calendars look lived-in.
  must(
    await db
      .from("blocked_dates")
      .insert([
        { property_id: lake, start_date: day(9), end_date: day(13), source: "manual", summary: "Owner stay" },
        { property_id: coast, start_date: day(5), end_date: day(10), source: "manual", summary: "Maintenance" },
        { property_id: coast, start_date: day(24), end_date: day(31), source: "manual", summary: "Owner stay" },
      ])
      .select("id"),
    "inserting blocked dates",
  );

  const demoBooking = await db.rpc("create_booking", {
    p_property_id: lake,
    p_status: "pending",
    p_check_in: day(20),
    p_check_out: day(24),
    p_guests_count: 4,
    p_has_pets: false,
    p_guest_name: "Sample Guest",
    p_guest_email: "sample.guest@example.com",
    p_guest_phone: "+1 555 010 9999",
    p_message: "Demo booking created by the seed script.",
    p_marketing_opt_in: true,
    p_currency: "USD",
    p_accommodation_cents: 126000,
    p_cleaning_fee_cents: 15000,
    p_pet_fee_cents: 0,
    p_tax_cents: 11280,
    p_total_cents: 152280,
    p_price_breakdown: null,
  });
  const booking = must(demoBooking, "creating the demo booking") as { id: string };
  must(
    await db.rpc("confirm_booking", { p_booking_id: booking.id, p_stripe_session_id: null, p_payment_intent_id: null }),
    "confirming the demo booking",
  );

  must(
    await db
      .from("testimonials")
      .insert(
        testimonials.map(({ slug, ...t }, i) => ({
          ...t,
          property_id: slug ? propertyIds.get(slug) : null,
          sort_order: i,
        })),
      )
      .select("id"),
    "inserting testimonials",
  );

  must(
    await db.from("guide_items").insert(guide.map((g, i) => ({ ...g, sort_order: i }))).select("id"),
    "inserting the local guide",
  );

  console.log(
    `Seeded ${properties.length} properties, ${testimonials.length} testimonials and ${guide.length} guide items (${localPhotos ? "local placeholder" : "Unsplash sample"} photos).`,
  );
}

main();
