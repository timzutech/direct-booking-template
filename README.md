# Direct booking website template

A reusable direct-booking site for short-term rental hosts. One codebase, rebranded per client by editing **`site.config.ts`** and the **database content** — nothing client-specific is hardcoded.

- **Stack:** Next.js (App Router, TypeScript, Tailwind) · Supabase (Postgres, Auth, Storage) · Stripe Checkout · Resend · Vercel (with Vercel Cron)
- **Public site:** home, stays, property pages (gallery, calendar, booking widget, map), local guide, about, contact, policies
- **Booking engine:** live pricing, per-property rules, pending → Stripe Checkout → confirmed by webhook, 30-minute holds, inquiry-only mode
- **Calendar sync:** imports Airbnb / Vrbo / Booking.com iCal feeds on a schedule (every 30 minutes on Vercel Pro); exports one iCal feed per property
- **Admin dashboard** at `/admin`: properties, photos, pricing, calendars, bookings, testimonials, guide, policies, guest CSV export
- **Demo mode** for spec demos: `DEMO_MODE=true`

---

## 1. New client setup checklist

Allow about an hour. Do the steps in order.

### 1. Duplicate the repo
- [ ] Create a new private repo from this one (GitHub → **Use this template**, or clone and push to a new remote).
- [ ] `npm install`

### 2. Brand it — `site.config.ts`
- [ ] Business name, short name, tagline, description, about text
- [ ] `url` (the final domain), contact email, phone, social links
- [ ] Colours (keep text/background and button contrast at 4.5:1 or better) and fonts
- [ ] `currency`, `locale`, `timezone` (the timezone decides what "today" is for bookings)
- [ ] Default check-in / check-out times, house rules, cancellation policy, terms, privacy
- [ ] Hero photo: put the file in `/public` and set `heroImage`, or use a full image URL
- [ ] Optional logo: put it in `/public` and set `logo`. Optional favicon: add `src/app/icon.png` and delete `src/app/icon.tsx`

### 3. Create the Supabase project
- [ ] Create a project at supabase.com (pick the region closest to the client).
- [ ] **Authentication → Sign In / Providers → Email:** turn **off** "Allow new users to sign up". (Access is also protected by an admin allowlist, but there is no reason to leave signup open.)
- [ ] Copy the Project URL, the anon/publishable key and the service-role/secret key (Project Settings → API).

### 4. Run the migrations
```bash
npx supabase login
```
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```
```bash
npx supabase db push
```
This creates all tables, Row Level Security policies, the booking functions and the `property-photos` storage bucket. (Alternative: paste the three files in `supabase/migrations/` into the SQL editor, in order.)

### 5. Environment variables
- [ ] Copy `.env.example` to `.env.local` and fill in the Supabase values.
- [ ] Create the host's login (the password must be at least 10 characters):
```bash
npm run create-admin -- host@clientdomain.com "a-strong-password"
```

### 6. Stripe — the client's own account
- [ ] In the **client's** Stripe dashboard: Developers → API keys → copy the secret key into `STRIPE_SECRET_KEY`. Start with test keys (`sk_test_…`).
- [ ] Developers → Webhooks → **Add endpoint**: `https://CLIENT-DOMAIN/api/stripe/webhook`, with these events:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`
- [ ] Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] Make sure `currency` in `site.config.ts` is one the Stripe account can charge.

### 7. Resend
- [ ] Create an API key → `RESEND_API_KEY`.
- [ ] Verify the client's domain in Resend, then set `EMAIL_FROM`, e.g. `Client Name <bookings@clientdomain.com>`.
- [ ] Set `HOST_NOTIFICATION_EMAIL` if notifications should go somewhere other than the public contact email.

### 8. Content
- [ ] Sign in at `/admin` and add each property: details, pricing, rules, photos, amenities.
- [ ] Set **buffer days** to at least 1 on every property that is also listed on Airbnb/Vrbo.
- [ ] Add testimonials (typed in by hand, with the guest's permission), the local guide, and review the policies.

### 9. Add the import iCal URLs
- [ ] For each property: Admin → Properties → *property* → **Calendar sync** → paste the Airbnb / Vrbo / Booking.com export link → **Add calendar**. The first import runs immediately and shows "Last synced".

### 10. Deploy to Vercel
- [ ] Import the repo in Vercel and add **every** variable from `.env.example` (Production, and Preview if used). Set `NEXT_PUBLIC_SITE_URL` to the final domain and `DEMO_MODE=false`.
- [ ] Set `CRON_SECRET` to a long random string. Vercel Cron sends it automatically.
- [ ] Deploy. `vercel.json` schedules `/api/cron/sync-calendars`.
  - **The schedule ships as once a day (`0 5 * * *`) so the project deploys on the Vercel Hobby plan**, which rejects anything more frequent.
  - **For a real client, use Vercel Pro and change the schedule to `*/30 * * * *`** (every 30 minutes), then redeploy. Daily sync is not enough to prevent double bookings.
  - If the client must stay on Hobby, call the endpoint every 30 minutes from an external scheduler with the `Authorization: Bearer <CRON_SECRET>` header, and use the **Sync now** button when needed.

### 11. Connect the domain
- [ ] Vercel → Project → Domains → add the domain and follow the DNS instructions.
- [ ] Confirm `NEXT_PUBLIC_SITE_URL`, `site.config.ts → url` and the Stripe webhook URL all use the final domain, then redeploy.

### 12. Paste the export iCal links into Airbnb / Vrbo
- [ ] Admin → Properties → *property* → **Calendar sync** → copy **Your export calendar link** (`https://CLIENT-DOMAIN/api/ical/<propertyId>.ics`).
- [ ] Airbnb: Calendar → Availability → Connect calendars → **Import calendar**. Vrbo: Calendar → Import & export → **Import calendar**.
- [ ] Airbnb and Vrbo re-read imported calendars on their own schedule (30 minutes to several hours). This is why buffer days are recommended.

### 13. Go-live test
- [ ] With Stripe **test** keys: make a booking with card `4242 4242 4242 4242`, confirm the booking turns "Confirmed" in the admin and that both emails arrive.
- [ ] Check the booked dates appear in the export feed and are blocked on the public calendar.
- [ ] Switch to live Stripe keys (and a live-mode webhook endpoint + secret), redeploy.

---

## 2. Spec demo in 20 minutes

A branded preview for a prospect, with payments switched off.

1. **Copy the repo** (2 min) and run `npm install`.
2. **Rebrand** (5 min) — in `site.config.ts` change `name`, `shortName`, `tagline`, the `colors`, and `heroImage`. Everything else can stay.
3. **Database** (5 min) — create a free Supabase project, then:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   ```bash
   npx supabase db push
   ```
4. **Seed sample content** (1 min) — put the three Supabase values in `.env.local`, then:
   ```bash
   npm run seed
   ```
   No Node on hand? Paste `supabase/demo-seed.sql` into the Supabase SQL editor instead — it loads the same content.

   This adds 3 sample properties with photos, amenities, seasonal prices, testimonials, a local guide and some calendar activity. To tailor the demo, edit the property names and locations in `/admin` (create a login with `npm run create-admin`) or directly in `scripts/seed.ts` before seeding.
5. **Deploy** (5 min) — import into Vercel with these variables only:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | the Vercel URL |
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase |
   | `DEMO_MODE` | `true` |

   No Stripe or Resend keys are needed in demo mode.
6. **Send the link.**

What demo mode does:
- A small **"Preview site"** banner on every page.
- The calendar and live price breakdown work, but the button reads **"Booking available soon"** and the booking API refuses requests.
- The contact form shows a preview message instead of sending email.
- Search engines are told not to index the site.

`DEMO_MODE` is read when the site is built, so **redeploy after changing it**. When the prospect signs, continue from step 2 of the setup checklist and reseed or clear the sample data with `npm run seed -- --reset` (this deletes all properties, bookings and guests).

---

## How it works

### Rebranding
| What | Where |
| --- | --- |
| Name, colours, fonts, contact, currency, default policies | `site.config.ts` |
| Properties, photos, prices, rules, iCal links | Admin → Properties |
| Testimonials, local guide, policy/about text | Admin (overrides the defaults in `site.config.ts`) |
| Extra Google fonts | `src/lib/fonts.ts` |

### Booking flow
1. The guest picks dates; the widget shows a live breakdown (nightly rate × nights, weekend rate, seasonal prices, cleaning fee, pet fee, taxes).
2. On submit the **server recomputes the price** (the browser's total is never trusted) and saves the booking as `pending` inside a database function that locks the property and re-checks availability.
3. Availability is re-checked immediately before the Stripe Checkout session is created. The session and the hold both expire after 30 minutes.
4. Stripe's webhook calls `confirm_booking`, which re-checks availability under the same lock and marks the booking `confirmed`. Guest and host receive emails.
5. If the dates were taken in the meantime (for example by an iCal import), the booking becomes `conflict`, **the payment is refunded automatically**, and both parties are emailed.
6. If the guest presses "back" on Stripe, the hold is released straight away.

Money is stored in minor units (cents). Stays are half-open ranges — the checkout day is free for the next arrival, before buffer days.

### Calendar sync
- **Import:** each feed's blocks are replaced atomically on every sync. If a feed fails (network error, non-calendar response), the previously imported dates **stay blocked** and the error is shown in the admin.
- **Export:** `/api/ical/<propertyId>.ics` contains confirmed direct bookings (padded by the property's buffer days) and manual blocks — never guest details, pending holds or imported blocks (so calendars cannot echo each other).
- Recurring events (`RRULE`) are not expanded; Airbnb, Vrbo and Booking.com do not use them.

### Security
- Row Level Security on every table. The public key can only read published content.
- Bookings and guests are never readable or writable with the public key. Guests create bookings through the server, which validates and prices them. This is deliberately stricter than "public can insert bookings": a direct insert would let anyone forge a price or a `confirmed` status.
- Admin access requires a Supabase Auth login **and** the email being in the `admins` table (`npm run create-admin`).
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` and `RESEND_API_KEY` are server-only.

### Known limits
- No rate limiting or CAPTCHA on the booking and contact forms (the contact form has a honeypot). A determined abuser could place 30-minute holds on dates; for a high-profile client add Vercel WAF rate limiting or Cloudflare Turnstile.
- Cancelling a booking in the admin releases the dates but does not refund — refunds are made in the Stripe dashboard.
- Taxes are one configurable percentage per property, applied to nights, cleaning and pet fee. It is not a tax engine.

---

## Local development

```bash
npx supabase start
```
```bash
cp .env.example .env.local
```
Fill `.env.local` from `npx supabase status`, then:
```bash
SEED_PHOTOS=local npm run seed
```
```bash
npm run create-admin -- host@example.com "local-admin-pass-1"
```
```bash
npm run dev
```

`SEED_PHOTOS=local` uses the offline placeholders in `public/demo`; without it the seed links to sample photos on Unsplash.

To receive Stripe webhooks locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

### Scripts
| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run seed` | Demo content (`-- --reset` wipes first) |
| `npm run create-admin -- email "password"` | Create or update the host login |
| `npm test` | Unit tests: pricing, stay rules, dates, iCal parse/export |
| `npm run test:e2e` | End-to-end suites (see below) |
| `npm run lint` / `typecheck` | Code checks |

### End-to-end tests
The e2e suites run the real app against the local database, with Stripe, Resend and the Airbnb/Vrbo feeds replaced by a small local mock.

```bash
npm run test:mock
```
In a second terminal, start the app pointed at the mock:
```bash
STRIPE_SECRET_KEY=sk_test_mock STRIPE_WEBHOOK_SECRET=whsec_testsecret STRIPE_API_BASE_URL=http://localhost:12111 RESEND_API_KEY=re_mock RESEND_BASE_URL=http://localhost:12111 CRON_SECRET=local-cron-secret npm run dev
```
In a third terminal:
```bash
npm run test:e2e
```
They expect the seeded database and the admin `host@example.com` / `local-admin-pass-1`. The admin suite also expects a non-admin Supabase user `stranger@example.com` / `stranger-pass-123` (sign one up through the Supabase Auth API or dashboard) to prove non-admins are refused.

### Project layout
```
site.config.ts              all branding and defaults
supabase/migrations/        schema, booking functions, RLS + storage
scripts/                    seed, create-admin, placeholder generator
src/app/(site)/             public pages
src/app/admin/              dashboard (login, pages, server actions)
src/app/api/                availability, bookings, Stripe webhook, cron, iCal export
src/lib/                    pricing, availability, dates, iCal, email, Supabase clients
src/components/             UI (booking widget, gallery, admin components)
tests/                      unit tests and e2e suites
vercel.json                 cron schedule
```
