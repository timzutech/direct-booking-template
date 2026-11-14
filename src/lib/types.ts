/** Row types matching supabase/migrations. Money is in minor units (cents). */

export type SleepingArrangement = { room: string; beds: string };

export type Property = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  location_label: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  sleeping_arrangements: SleepingArrangement[];
  house_rules: string | null;
  base_price_cents: number;
  weekend_price_cents: number | null;
  weekend_days: number[];
  cleaning_fee_cents: number;
  pets_allowed: boolean;
  pet_fee_cents: number;
  tax_rate_percent: number;
  min_nights: number;
  max_nights: number;
  booking_window_days: number;
  min_advance_days: number;
  buffer_days: number;
  inquiry_only: boolean;
  check_in_time: string | null;
  check_out_time: string | null;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PropertyPhoto = {
  id: string;
  property_id: string;
  url: string;
  storage_path: string | null;
  alt: string;
  sort_order: number;
};

export type Amenity = {
  id: string;
  name: string;
  category: string;
  icon: string;
  sort_order: number;
};

export type PricingRule = {
  id: string;
  property_id: string;
  name: string;
  start_date: string;
  end_date: string;
  nightly_price_cents: number;
  weekend_price_cents: number | null;
  min_nights: number | null;
  priority: number;
  created_at: string;
};

export type IcalFeed = {
  id: string;
  property_id: string;
  name: string;
  url: string;
  last_synced_at: string | null;
  last_status: "ok" | "error" | null;
  last_error: string | null;
  last_event_count: number | null;
  created_at: string;
};

export type BlockedDate = {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  source: "manual" | "ical";
  feed_id: string | null;
  external_uid: string | null;
  summary: string | null;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "expired"
  | "conflict"
  | "inquiry"
  | "declined";

export type Booking = {
  id: string;
  reference: string;
  property_id: string;
  guest_id: string | null;
  status: BookingStatus;
  check_in: string;
  check_out: string;
  nights: number;
  guests_count: number;
  has_pets: boolean;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  message: string | null;
  currency: string;
  accommodation_cents: number;
  cleaning_fee_cents: number;
  pet_fee_cents: number;
  tax_cents: number;
  total_cents: number;
  price_breakdown: unknown;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  expires_at: string | null;
  confirmed_at: string | null;
  refunded_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Guest = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  marketing_opt_in: boolean;
  created_at: string;
};

export type Testimonial = {
  id: string;
  guest_name: string;
  guest_location: string | null;
  quote: string;
  rating: number;
  stay_label: string | null;
  property_id: string | null;
  is_published: boolean;
  sort_order: number;
};

export type GuideCategory = "restaurant" | "activity" | "tip";

export type GuideItem = {
  id: string;
  category: GuideCategory;
  title: string;
  description: string;
  address: string | null;
  url: string | null;
  is_published: boolean;
  sort_order: number;
};

export type ContentKey = "cancellation_policy" | "house_rules" | "terms" | "privacy" | "about";

export type PropertyWithPhotos = Property & { photos: PropertyPhoto[] };
export type PropertyFull = PropertyWithPhotos & { amenities: Amenity[]; pricing_rules: PricingRule[] };

/** A half-open range of unavailable nights: [start, end). ISO dates. */
export type DateRange = { start: string; end: string };
