-- =============================================================================
-- Direct booking template — core schema
-- Money is stored as integer minor units (cents). Stays are half-open date
-- ranges: [check_in, check_out) — the checkout day itself is free for the
-- next guest (before buffer days are applied).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Admins: the allowlist of host logins. A Supabase Auth user is only treated
-- as an admin if their email is in this table (see is_admin()).
-- ---------------------------------------------------------------------------
create table public.admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Properties
-- ---------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  tagline text,
  description text not null default '',
  location_label text not null default '',     -- e.g. "Lake Placid, New York"
  address text,                                 -- only shared after booking
  latitude double precision,
  longitude double precision,

  max_guests int not null default 2 check (max_guests > 0),
  bedrooms int not null default 1 check (bedrooms >= 0),
  beds int not null default 1 check (beds >= 0),
  bathrooms numeric(3,1) not null default 1 check (bathrooms >= 0),
  sleeping_arrangements jsonb not null default '[]'::jsonb, -- [{ "room": "...", "beds": "..." }]
  house_rules text,                             -- null = use site default

  -- pricing
  base_price_cents int not null check (base_price_cents >= 0),
  weekend_price_cents int check (weekend_price_cents >= 0),  -- null = same as base
  weekend_days int[] not null default '{5,6}',  -- nights charged at weekend rate; 0 = Sunday … 6 = Saturday
  cleaning_fee_cents int not null default 0 check (cleaning_fee_cents >= 0),
  pets_allowed boolean not null default false,
  pet_fee_cents int not null default 0 check (pet_fee_cents >= 0),
  tax_rate_percent numeric(5,2) not null default 0 check (tax_rate_percent >= 0 and tax_rate_percent <= 100),

  -- booking rules
  min_nights int not null default 1 check (min_nights >= 1),
  max_nights int not null default 30 check (max_nights >= 1),
  booking_window_days int not null default 365 check (booking_window_days >= 1), -- how far ahead guests can book
  min_advance_days int not null default 1 check (min_advance_days >= 0),        -- lead time before check-in
  buffer_days int not null default 0 check (buffer_days >= 0),                  -- empty days kept around each stay
  inquiry_only boolean not null default false,

  check_in_time text,                           -- null = use site default
  check_out_time text,

  is_published boolean not null default false,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_nights >= min_nights)
);

create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,               -- public URL (Supabase Storage or external)
  storage_path text,               -- set for files uploaded to the property-photos bucket
  alt text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index property_photos_property_idx on public.property_photos(property_id, sort_order);

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null default 'General',
  icon text not null default 'check',   -- key into the icon set in src/components/icons.tsx
  sort_order int not null default 0
);

create table public.property_amenities (
  property_id uuid not null references public.properties(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  primary key (property_id, amenity_id)
);

-- Seasonal / date-specific price overrides. If several rules cover a night,
-- the one with the highest priority wins (ties: most recently created).
create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,                 -- inclusive last night
  nightly_price_cents int not null check (nightly_price_cents >= 0),
  weekend_price_cents int check (weekend_price_cents >= 0),
  min_nights int check (min_nights >= 1),
  priority int not null default 0,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index pricing_rules_property_idx on public.pricing_rules(property_id, start_date);

-- ---------------------------------------------------------------------------
-- Calendar: iCal feeds and blocked dates
-- ---------------------------------------------------------------------------
create table public.ical_feeds (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,                     -- "Airbnb", "Vrbo", "Booking.com"…
  url text not null,
  last_synced_at timestamptz,
  last_status text check (last_status in ('ok', 'error')),
  last_error text,
  last_event_count int,
  created_at timestamptz not null default now()
);
create index ical_feeds_property_idx on public.ical_feeds(property_id);

create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  start_date date not null,
  end_date date not null,                 -- exclusive (like a checkout date)
  source text not null default 'manual' check (source in ('manual', 'ical')),
  feed_id uuid references public.ical_feeds(id) on delete cascade,
  external_uid text,
  summary text,
  created_at timestamptz not null default now(),
  check (end_date > start_date),
  check ((source = 'ical') = (feed_id is not null))
);
create index blocked_dates_property_idx on public.blocked_dates(property_id, start_date, end_date);
create index blocked_dates_feed_idx on public.blocked_dates(feed_id);

-- ---------------------------------------------------------------------------
-- Guests and bookings
-- ---------------------------------------------------------------------------
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  phone text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,          -- short human-friendly code, e.g. "BK-7F3K9Q"
  property_id uuid not null references public.properties(id) on delete restrict,
  guest_id uuid references public.guests(id) on delete set null,
  status text not null check (status in
    ('pending', 'confirmed', 'cancelled', 'expired', 'conflict', 'inquiry', 'declined')),
  check_in date not null,
  check_out date not null,
  nights int generated always as (check_out - check_in) stored,
  guests_count int not null check (guests_count > 0),
  has_pets boolean not null default false,

  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  message text,

  -- price snapshot taken when the booking was created
  currency text not null,
  accommodation_cents int not null default 0,
  cleaning_fee_cents int not null default 0,
  pet_fee_cents int not null default 0,
  tax_cents int not null default 0,
  total_cents int not null default 0,
  price_breakdown jsonb,                   -- full per-night breakdown

  stripe_session_id text unique,
  stripe_payment_intent_id text,
  expires_at timestamptz,                  -- pending bookings stop holding dates after this
  confirmed_at timestamptz,
  refunded_at timestamptz,
  notes text,                              -- private host notes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);
create index bookings_property_dates_idx on public.bookings(property_id, check_in, check_out);
create index bookings_status_idx on public.bookings(status);
create index bookings_guest_idx on public.bookings(guest_id);

-- ---------------------------------------------------------------------------
-- Editable content
-- ---------------------------------------------------------------------------
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  guest_location text,
  quote text not null,
  rating int not null default 5 check (rating between 1 and 5),
  stay_label text,                          -- e.g. "Stayed June 2025"
  property_id uuid references public.properties(id) on delete set null,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.guide_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('restaurant', 'activity', 'tip')),
  title text not null,
  description text not null default '',
  address text,
  url text,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Key/value text that overrides the defaults in site.config.ts
-- (keys: cancellation_policy, house_rules, terms, privacy, about).
create table public.site_content (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger properties_touch before update on public.properties
  for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();
create trigger guests_touch before update on public.guests
  for each row execute function public.touch_updated_at();
create trigger site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();
