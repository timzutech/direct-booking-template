-- =============================================================================
-- Row Level Security
--   Public (anon key):  read published content only.
--   Admin (logged-in host whose email is in public.admins): full access.
--   Bookings and guests are never readable or writable with the public key.
--   Guests create bookings through the server (service-role key), which
--   recomputes the price and checks availability — see create_booking().
-- =============================================================================

alter table public.admins             enable row level security;
alter table public.properties         enable row level security;
alter table public.property_photos    enable row level security;
alter table public.amenities          enable row level security;
alter table public.property_amenities enable row level security;
alter table public.pricing_rules      enable row level security;
alter table public.ical_feeds         enable row level security;
alter table public.blocked_dates      enable row level security;
alter table public.guests             enable row level security;
alter table public.bookings           enable row level security;
alter table public.testimonials       enable row level security;
alter table public.guide_items        enable row level security;
alter table public.site_content       enable row level security;

-- Public read of published content ------------------------------------------
create policy "public reads published properties" on public.properties
  for select to anon, authenticated using (is_published);

create policy "public reads photos of published properties" on public.property_photos
  for select to anon, authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and p.is_published));

create policy "public reads amenities" on public.amenities
  for select to anon, authenticated using (true);

create policy "public reads amenities of published properties" on public.property_amenities
  for select to anon, authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and p.is_published));

create policy "public reads pricing of published properties" on public.pricing_rules
  for select to anon, authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and p.is_published));

create policy "public reads published testimonials" on public.testimonials
  for select to anon, authenticated using (is_published);

create policy "public reads published guide items" on public.guide_items
  for select to anon, authenticated using (is_published);

create policy "public reads site content" on public.site_content
  for select to anon, authenticated using (true);

-- Admin: everything ----------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'properties', 'property_photos', 'amenities', 'property_amenities', 'pricing_rules',
    'ical_feeds', 'blocked_dates', 'guests', 'bookings', 'testimonials', 'guide_items',
    'site_content'
  ] loop
    execute format(
      'create policy "admin full access" on public.%I for all to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

create policy "admins can see the admin list" on public.admins
  for select to authenticated using ((select public.is_admin()));

-- Table privileges: the anon key gets SELECT only, and only where a policy allows it.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.properties, public.property_photos, public.amenities,
  public.property_amenities, public.pricing_rules, public.testimonials,
  public.guide_items, public.site_content to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.admins from authenticated;
grant all on all tables in schema public to service_role;

-- =============================================================================
-- Storage: public bucket for property photos; only admins can write.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-photos', 'property-photos', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "admin uploads property photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-photos' and (select public.is_admin()));

create policy "admin updates property photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'property-photos' and (select public.is_admin()));

create policy "admin deletes property photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-photos' and (select public.is_admin()));

create policy "admin lists property photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'property-photos' and (select public.is_admin()));
