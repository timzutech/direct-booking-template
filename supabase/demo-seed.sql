-- Demo content as plain SQL — the same data as `npm run seed`, for when you
-- would rather paste into the Supabase SQL editor than run Node.
-- Run it once on an EMPTY database (after the migrations).

insert into public.amenities (name, category, icon, sort_order) values
  ('Fast Wi-Fi','Essentials','wifi',0), ('Fully equipped kitchen','Essentials','kitchen',1),
  ('Washer & dryer','Essentials','washer',2), ('Free parking','Essentials','parking',3),
  ('Air conditioning','Comfort','snowflake',4), ('Heating','Comfort','flame',5),
  ('Wood-burning fireplace','Comfort','flame',6), ('Hot tub','Outdoors','hot-tub',7),
  ('Private dock','Outdoors','water',8), ('Kayaks & paddleboards','Outdoors','water',9),
  ('Fire pit','Outdoors','flame',10), ('BBQ grill','Outdoors','grill',11),
  ('Beach access','Outdoors','water',12), ('Outdoor shower','Outdoors','water',13),
  ('Balcony','Outdoors','sun',14), ('Dedicated workspace','Extras','desk',15),
  ('Smart TV','Extras','tv',16), ('Espresso machine','Extras','coffee',17),
  ('Pet friendly','Extras','paw',18), ('Crib & high chair','Extras','baby',19);

insert into public.properties
  (slug, name, tagline, description, location_label, address, latitude, longitude,
   max_guests, bedrooms, beds, bathrooms, sleeping_arrangements,
   base_price_cents, weekend_price_cents, cleaning_fee_cents, pets_allowed, pet_fee_cents, tax_rate_percent,
   min_nights, max_nights, booking_window_days, min_advance_days, buffer_days, inquiry_only,
   is_published, is_featured, sort_order)
values
  ('heron-lake-cabin', 'Heron Lake Cabin', 'A cedar cabin on the water, built for unhurried weekends.',
   E'Wake to mist on the lake and coffee on the dock. Heron Lake Cabin is a three-bedroom cedar retreat with a wall of windows, a wood-burning fireplace and a private dock with kayaks ready to go.\n\nEvenings are for the fire pit and the hot tub under the pines. Inside, the kitchen is stocked for real cooking, the beds are dressed in linen, and there is fast Wi-Fi for the days you can''t fully switch off.\n\nThe village, with its bakery and general store, is a ten-minute drive.',
   'Lake Placid, New York', '14 Heron Point Road, Lake Placid, NY 12946', 44.2795, -73.9799,
   6, 3, 4, 2, '[{"room":"Primary bedroom","beds":"1 king bed"},{"room":"Lake room","beds":"1 queen bed"},{"room":"Bunk room","beds":"2 twin beds"}]',
   28500, 34500, 15000, true, 7500, 8, 2, 21, 365, 1, 1, false, true, true, 0),
  ('saltgrass-beach-house', 'Saltgrass Beach House', 'Barefoot days, a short boardwalk from the sand.',
   E'Saltgrass is a breezy four-bedroom beach house with wide porches, an outdoor shower and a boardwalk that drops you on the sand in two minutes.\n\nThe open kitchen and long dining table are made for big family dinners. Upstairs, the primary suite has its own balcony facing the dunes; downstairs, a bunk room keeps the kids happy.\n\nBeach chairs, umbrellas and a wagon are waiting in the shed — just bring swimsuits.',
   'Tybee Island, Georgia', '7 Saltgrass Lane, Tybee Island, GA 31328', 32.0005, -80.8457,
   8, 4, 6, 3, '[{"room":"Primary suite","beds":"1 king bed"},{"room":"Dune room","beds":"1 queen bed"},{"room":"Garden room","beds":"1 queen bed"},{"room":"Bunk room","beds":"1 bunk bed, 1 twin bed"}]',
   39500, 46500, 22500, false, 0, 13, 3, 28, 365, 2, 1, false, true, true, 1),
  ('the-foundry-loft', 'The Foundry Loft', 'A light-filled loft in the old quarter — walk to everything.',
   E'Once a printworks, now a calm one-bedroom loft with fourteen-foot ceilings, original timber beams and tall factory windows.\n\nYou are a five-minute walk from the squares, coffee shops and the riverfront, with a quiet courtyard to come home to. There is a proper desk for working stays and a kitchen you will actually want to cook in.\n\nStays at the Foundry Loft are by request — send us your dates and we will reply within a few hours.',
   'Savannah, Georgia', '212 Foundry Row, Savannah, GA 31401', 32.0809, -81.0912,
   2, 1, 1, 1, '[{"room":"Bedroom","beds":"1 queen bed"}]',
   16500, 19500, 8500, false, 0, 13, 2, 30, 270, 1, 0, true, true, true, 2);

insert into public.property_photos (property_id, url, alt, sort_order)
select p.id, 'https://images.unsplash.com/photo-' || v.photo || '?auto=format&fit=crop&w=1600&q=75', v.alt, v.n
from (values
  ('heron-lake-cabin', 0, '1695668193703-cf6a2c6d784b', 'Cabin among the trees beside the lake'),
  ('heron-lake-cabin', 1, '1680703486830-1b5af60635d7', 'Living room with fireplace and deep sofas'),
  ('heron-lake-cabin', 2, '1664369058082-ee8e36028106', 'Sitting area with a couch beside the fireplace'),
  ('heron-lake-cabin', 3, '1697807713049-d171c4dd9d5e', 'Bright lounge with tall windows'),
  ('heron-lake-cabin', 4, '1785528266178-81cdec8eacf4', 'Bedroom with a large window looking over the lake'),
  ('heron-lake-cabin', 5, '1574514342513-f739e07c81cf', 'The house and shoreline at sunset'),
  ('saltgrass-beach-house', 0, '1730005523015-422bd53dda0b', 'View of the ocean from the beach house'),
  ('saltgrass-beach-house', 1, '1726090401458-7abb00f7450c', 'Calm, neutral living room with a fireplace'),
  ('saltgrass-beach-house', 2, '1770414173168-f6c666501225', 'Bright coastal bedroom with a large bed'),
  ('saltgrass-beach-house', 3, '1726091097680-5da84f593ccd', 'Seating area filled with natural light'),
  ('saltgrass-beach-house', 4, '1793891703633-0623d02dde98', 'Bedroom looking out to the beach and palms'),
  ('saltgrass-beach-house', 5, '1574620845949-61a08a005988', 'The blue-painted house from the lane'),
  ('the-foundry-loft', 0, '1783990349147-906f62b882c1', 'Open-plan loft with dining area and kitchen'),
  ('the-foundry-loft', 1, '1617817643768-8855fc457e3a', 'Long wooden dining table in the loft'),
  ('the-foundry-loft', 2, '1619989652700-9984844cb0ea', 'Living area with a warm, neutral palette'),
  ('the-foundry-loft', 3, '1650137938625-11576502aecd', 'Lounge with tall windows and plants'),
  ('the-foundry-loft', 4, '1738748444659-f8975b12ce57', 'Bedroom with built-in wardrobe'),
  ('the-foundry-loft', 5, '1672082497059-1e6c0209eeeb', 'City view from the window at dusk')
) as v(slug, n, photo, alt)
join public.properties p on p.slug = v.slug;

insert into public.property_amenities (property_id, amenity_id)
select p.id, a.id
from (values
  ('heron-lake-cabin', array['Fast Wi-Fi','Fully equipped kitchen','Washer & dryer','Free parking','Heating','Wood-burning fireplace','Hot tub','Private dock','Kayaks & paddleboards','Fire pit','BBQ grill','Smart TV','Pet friendly']),
  ('saltgrass-beach-house', array['Fast Wi-Fi','Fully equipped kitchen','Washer & dryer','Free parking','Air conditioning','Beach access','Outdoor shower','BBQ grill','Balcony','Smart TV','Espresso machine','Crib & high chair']),
  ('the-foundry-loft', array['Fast Wi-Fi','Fully equipped kitchen','Washer & dryer','Air conditioning','Heating','Dedicated workspace','Smart TV','Espresso machine'])
) as v(slug, names)
join public.properties p on p.slug = v.slug
join public.amenities a on a.name = any(v.names);

insert into public.pricing_rules (property_id, name, start_date, end_date, nightly_price_cents, weekend_price_cents, min_nights, priority)
select p.id, v.name, make_date(extract(year from current_date)::int + v.y1, v.m1, v.d1),
       make_date(extract(year from current_date)::int + v.y2, v.m2, v.d2), v.nightly, v.weekend, v.min_nights, v.priority
from (values
  ('heron-lake-cabin', 'Summer season', 1, 6, 15, 1, 9, 5, 34500, 39500, 3, 0),
  ('heron-lake-cabin', 'Holiday week', 0, 12, 20, 1, 1, 2, 39500, null, 4, 10),
  ('saltgrass-beach-house', 'Summer season', 1, 5, 25, 1, 8, 31, 49500, 55500, 5, 0)
) as v(slug, name, y1, m1, d1, y2, m2, d2, nightly, weekend, min_nights, priority)
join public.properties p on p.slug = v.slug;

insert into public.blocked_dates (property_id, start_date, end_date, source, summary)
select p.id, current_date + v.a, current_date + v.b, 'manual', v.summary
from (values
  ('heron-lake-cabin', 9, 13, 'Owner stay'),
  ('saltgrass-beach-house', 5, 10, 'Maintenance'),
  ('saltgrass-beach-house', 24, 31, 'Owner stay')
) as v(slug, a, b, summary)
join public.properties p on p.slug = v.slug;

with g as (
  insert into public.guests (email, name, phone, marketing_opt_in)
  values ('sample.guest@example.com', 'Sample Guest', '+1 555 010 9999', true)
  returning id
)
insert into public.bookings
  (reference, property_id, guest_id, status, check_in, check_out, guests_count, guest_name, guest_email, guest_phone,
   message, currency, accommodation_cents, cleaning_fee_cents, tax_cents, total_cents, confirmed_at)
select 'BK-SAMPLE', p.id, g.id, 'confirmed', current_date + 20, current_date + 24, 4, 'Sample Guest',
       'sample.guest@example.com', '+1 555 010 9999', 'Demo booking created by the seed.', 'USD',
       126000, 15000, 11280, 152280, now()
from g, public.properties p where p.slug = 'heron-lake-cabin';

insert into public.testimonials (guest_name, guest_location, quote, rating, stay_label, property_id, sort_order)
select v.guest_name, v.guest_location, v.quote, 5, v.stay_label, p.id, v.n
from (values
  (0, 'Maya R.', 'Boston, MA', 'We have stayed in a lot of rentals and this was the first that felt like someone truly cared. The dock at sunrise was worth the drive alone.', 'Heron Lake Cabin', 'heron-lake-cabin'),
  (1, 'Daniel & Priya', 'Atlanta, GA', 'Booking direct was effortless and noticeably cheaper than the listing sites. The house was spotless and the beach gear saved us a car full of luggage.', 'Saltgrass Beach House', 'saltgrass-beach-house'),
  (2, 'Colette B.', 'Toronto, ON', 'A beautiful, quiet loft right in the middle of everything. The local guide sent us to the best dinner of our trip.', 'The Foundry Loft', 'the-foundry-loft'),
  (3, 'The Okafor family', 'Charlotte, NC', 'Our third stay and it will not be our last. Quick answers, thoughtful touches, and a fair price every time.', 'Returning guests', null)
) as v(n, guest_name, guest_location, quote, stay_label, slug)
left join public.properties p on p.slug = v.slug;

insert into public.guide_items (category, title, description, address, sort_order) values
  ('restaurant', 'The Lantern Room', 'Candlelit, seasonal and worth booking ahead. Ask for the corner table and order whatever the fish is.', '18 Main Street', 0),
  ('restaurant', 'Marigold Bakery', 'Cardamom buns out of the oven at 8am. They sell out by ten on weekends.', '3 Mill Lane', 1),
  ('restaurant', 'Dockside Oyster Bar', 'Paper-lined trays, cold drinks and the best sunset seats in town. No reservations.', 'Harbor Walk', 2),
  ('activity', 'Sunrise paddle', 'The water is glass before 7am. Kayaks are at the house; head left along the shore to the heron rookery.', null, 3),
  ('activity', 'Ridge Trail loop', 'A 4-mile loop with a big view for modest effort. Trailhead parking fills by 9am in summer.', 'Ridge Road trailhead', 4),
  ('activity', 'Saturday farmers'' market', 'Local cheese, flowers and peaches in season. 8am to noon, rain or shine.', 'Town Square', 5),
  ('tip', 'Groceries on the way in', 'The last full supermarket is 20 minutes before you arrive — stock up there. The village store covers the basics.', null, 6),
  ('tip', 'Book dinner early', 'In high season the good tables go a week or two ahead. Message us and we will happily make a reservation for you.', null, 7),
  ('tip', 'Pack a layer', 'Evenings by the water cool down quickly, even in July. There are blankets in the chest by the door.', null, 8);
