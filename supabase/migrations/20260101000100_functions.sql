-- =============================================================================
-- Availability and booking functions
-- All booking writes go through these functions, called by the server with the
-- service-role key. Each takes a per-property advisory lock so two requests for
-- the same property can never both pass the availability check.
-- =============================================================================

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- A booking holds its dates while confirmed, or while pending and not expired.
create function public.booking_holds_dates(b public.bookings) returns boolean
language sql stable set search_path = '' as $$
  select b.status = 'confirmed'
      or (b.status = 'pending' and b.expires_at is not null and b.expires_at > now());
$$;

-- Every date range a guest cannot book, with buffer days already applied.
-- Buffers are added around direct bookings and imported (Airbnb/Vrbo) stays,
-- but not around manual blocks.
create function public.unavailable_ranges(p_property_id uuid, p_exclude_booking uuid default null)
returns table (start_date date, end_date date, kind text)
language sql stable security definer set search_path = '' as $$
  select (b.check_in - p.buffer_days)::date, (b.check_out + p.buffer_days)::date, 'booking'
  from public.bookings b
  join public.properties p on p.id = b.property_id
  where b.property_id = p_property_id
    and public.booking_holds_dates(b)
    and (p_exclude_booking is null or b.id <> p_exclude_booking)
  union all
  select
    case when d.source = 'ical' then (d.start_date - p.buffer_days)::date else d.start_date end,
    case when d.source = 'ical' then (d.end_date + p.buffer_days)::date else d.end_date end,
    d.source
  from public.blocked_dates d
  join public.properties p on p.id = d.property_id
  where d.property_id = p_property_id;
$$;

create function public.is_range_available(
  p_property_id uuid, p_check_in date, p_check_out date, p_exclude_booking uuid default null
) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_check_out > p_check_in and not exists (
    select 1 from public.unavailable_ranges(p_property_id, p_exclude_booking) u
    where u.start_date < p_check_out and u.end_date > p_check_in
  );
$$;

create function public.lock_property(p_property_id uuid) returns void
language sql set search_path = '' as $$
  select pg_advisory_xact_lock(hashtextextended(p_property_id::text, 42));
$$;

create function public.new_booking_reference() returns text
language plpgsql set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  ref text;
  bytes bytea;
begin
  loop
    bytes := extensions.gen_random_bytes(6);
    ref := 'BK-';
    for i in 0..5 loop
      ref := ref || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.bookings where reference = ref);
  end loop;
  return ref;
end $$;

-- Creates a pending booking (or an inquiry) if the dates are free.
-- Raises 'DATES_UNAVAILABLE' when they are not.
create function public.create_booking(
  p_property_id uuid,
  p_status text,                 -- 'pending' or 'inquiry'
  p_check_in date,
  p_check_out date,
  p_guests_count int,
  p_has_pets boolean,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_message text,
  p_marketing_opt_in boolean,
  p_currency text,
  p_accommodation_cents int,
  p_cleaning_fee_cents int,
  p_pet_fee_cents int,
  p_tax_cents int,
  p_total_cents int,
  p_price_breakdown jsonb,
  p_hold_minutes int default 30
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_guest_id uuid;
  v_booking public.bookings;
  v_email text := lower(trim(p_guest_email));
begin
  if p_status not in ('pending', 'inquiry') then
    raise exception 'INVALID_STATUS';
  end if;

  perform public.lock_property(p_property_id);

  if not public.is_range_available(p_property_id, p_check_in, p_check_out) then
    raise exception 'DATES_UNAVAILABLE';
  end if;

  insert into public.guests (email, name, phone, marketing_opt_in)
  values (v_email, trim(p_guest_name), nullif(trim(p_guest_phone), ''), coalesce(p_marketing_opt_in, false))
  on conflict (email) do update set
    name = excluded.name,
    phone = coalesce(excluded.phone, public.guests.phone),
    marketing_opt_in = public.guests.marketing_opt_in or excluded.marketing_opt_in
  returning id into v_guest_id;

  insert into public.bookings (
    reference, property_id, guest_id, status, check_in, check_out, guests_count, has_pets,
    guest_name, guest_email, guest_phone, message, currency,
    accommodation_cents, cleaning_fee_cents, pet_fee_cents, tax_cents, total_cents,
    price_breakdown, expires_at
  ) values (
    public.new_booking_reference(), p_property_id, v_guest_id, p_status, p_check_in, p_check_out,
    p_guests_count, coalesce(p_has_pets, false),
    trim(p_guest_name), v_email, nullif(trim(p_guest_phone), ''), nullif(trim(p_message), ''), p_currency,
    p_accommodation_cents, p_cleaning_fee_cents, p_pet_fee_cents, p_tax_cents, p_total_cents,
    p_price_breakdown,
    case when p_status = 'pending' then now() + make_interval(mins => p_hold_minutes) end
  ) returning * into v_booking;

  return v_booking;
end $$;

-- Re-checks availability for a pending booking right before the Stripe
-- Checkout session is created. Returns false (and expires the booking) if the
-- dates were taken or the hold ran out.
create function public.recheck_pending_booking(p_booking_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v public.bookings;
begin
  select * into v from public.bookings where id = p_booking_id;
  if not found then return false; end if;
  perform public.lock_property(v.property_id);
  select * into v from public.bookings where id = p_booking_id for update;

  if v.status <> 'pending' or v.expires_at <= now()
     or not public.is_range_available(v.property_id, v.check_in, v.check_out, v.id) then
    update public.bookings set status = 'expired' where id = v.id and status = 'pending';
    return false;
  end if;
  return true;
end $$;

-- Called from the Stripe webhook once payment has succeeded.
-- Returns: 'confirmed'          — booking is now confirmed
--          'already_confirmed'  — webhook replay, nothing changed
--          'conflict'           — dates were taken in the meantime; caller must refund
--          'not_found'
create function public.confirm_booking(
  p_booking_id uuid, p_stripe_session_id text, p_payment_intent_id text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v public.bookings;
begin
  select * into v from public.bookings where id = p_booking_id;
  if not found then return 'not_found'; end if;
  perform public.lock_property(v.property_id);
  select * into v from public.bookings where id = p_booking_id for update;

  if v.status = 'confirmed' then return 'already_confirmed'; end if;
  if v.status = 'conflict' then return 'conflict'; end if;

  -- A paid booking is honoured even if its 30-minute hold just ran out,
  -- as long as nobody else took the dates.
  if public.is_range_available(v.property_id, v.check_in, v.check_out, v.id) then
    update public.bookings set
      status = 'confirmed', confirmed_at = now(), expires_at = null,
      stripe_session_id = coalesce(p_stripe_session_id, stripe_session_id),
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id)
    where id = v.id;
    return 'confirmed';
  end if;

  update public.bookings set
    status = 'conflict', expires_at = null,
    stripe_session_id = coalesce(p_stripe_session_id, stripe_session_id),
    stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id)
  where id = v.id;
  return 'conflict';
end $$;

-- Marks stale pending bookings as expired (housekeeping; availability checks
-- already ignore them the moment expires_at passes).
create function public.expire_stale_bookings() returns int
language sql security definer set search_path = '' as $$
  with done as (
    update public.bookings set status = 'expired'
    where status = 'pending' and expires_at <= now()
    returning 1
  ) select count(*)::int from done;
$$;

-- Atomically replaces the imported blocks of one iCal feed.
-- p_events: [{ "start": "2026-01-01", "end": "2026-01-05", "uid": "...", "summary": "..." }]
create function public.replace_feed_blocks(p_feed_id uuid, p_events jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_property_id uuid;
  v_count int;
begin
  select property_id into v_property_id from public.ical_feeds where id = p_feed_id;
  if not found then raise exception 'FEED_NOT_FOUND'; end if;
  perform public.lock_property(v_property_id);

  delete from public.blocked_dates where feed_id = p_feed_id;

  insert into public.blocked_dates (property_id, start_date, end_date, source, feed_id, external_uid, summary)
  select v_property_id, (e ->> 'start')::date, (e ->> 'end')::date, 'ical', p_feed_id,
         e ->> 'uid', left(e ->> 'summary', 200)
  from jsonb_array_elements(p_events) e
  where (e ->> 'end')::date > (e ->> 'start')::date;
  get diagnostics v_count = row_count;

  update public.ical_feeds set
    last_synced_at = now(), last_status = 'ok', last_error = null, last_event_count = v_count
  where id = p_feed_id;
  return v_count;
end $$;

-- Public availability for the booking calendar: date ranges only, no guest data,
-- and only for published properties.
create function public.get_public_unavailable_ranges(p_property_id uuid)
returns table (start_date date, end_date date)
language sql stable security definer set search_path = '' as $$
  select u.start_date, u.end_date
  from public.unavailable_ranges(p_property_id) u
  where u.end_date >= current_date - 1
    and exists (select 1 from public.properties p where p.id = p_property_id and p.is_published);
$$;

-- Lock down function execution: nothing is callable by default.
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.get_public_unavailable_ranges(uuid) to anon, authenticated;
grant execute on function public.booking_holds_dates(public.bookings) to authenticated;
grant execute on function public.unavailable_ranges(uuid, uuid) to service_role;
grant execute on all functions in schema public to service_role;
