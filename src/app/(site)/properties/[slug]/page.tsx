import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { siteConfig } from "../../../../../site.config";
import { BookingWidget } from "@/components/booking/booking-widget";
import { Gallery } from "@/components/gallery";
import { Icon } from "@/components/icons";
import { MapEmbed } from "@/components/map-embed";
import { RichText } from "@/components/rich-text";
import { PropertyJsonLd } from "@/components/property-json-ld";
import { getContent, getProperties, getPropertyBySlug } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { formatBaths, formatMoney, formatTime, plural } from "@/lib/format";
import { startingPrice } from "@/lib/pricing";
import type { Amenity } from "@/lib/types";

type Props = PageProps<"/properties/[slug]">;

export async function generateStaticParams() {
  const properties = await getProperties();
  // Cache Components needs at least one entry; the placeholder simply renders the 404 page.
  return properties.length > 0 ? properties.map((p) => ({ slug: p.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return { title: "Stay not found" };
  const description =
    property.tagline ??
    `${property.name} in ${property.location_label} — sleeps ${property.max_guests}. Book direct for the best rate.`;
  const cover = property.photos[0];
  return {
    title: `${property.name} — ${property.location_label}`,
    description,
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: {
      title: property.name,
      description,
      url: `/properties/${property.slug}`,
      images: cover && !cover.url.endsWith(".svg") ? [{ url: cover.url, alt: cover.alt || property.name }] : undefined,
    },
  };
}

export default function PropertyPage({ params }: Props) {
  return (
    <Suspense fallback={<PropertySkeleton />}>
      <PropertyContent params={params} />
    </Suspense>
  );
}

function PropertySkeleton() {
  return (
    // Tall on purpose: keeps the footer off-screen so nothing jumps when the content arrives.
    <div className="container-page min-h-[200vh] py-10" role="status" aria-label="Loading stay">
      <div className="skeleton h-10 w-2/3 max-w-lg" />
      <div className="skeleton mt-3 h-5 w-48" />
      <div className="skeleton mt-8 aspect-[4/3] w-full sm:aspect-[16/9]" />
    </div>
  );
}

function groupAmenities(amenities: Amenity[]): [string, Amenity[]][] {
  const groups = new Map<string, Amenity[]>();
  for (const a of amenities) groups.set(a.category, [...(groups.get(a.category) ?? []), a]);
  return [...groups.entries()];
}

async function PropertyContent({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const [property, content] = await Promise.all([getPropertyBySlug(slug), getContent()]);
  if (!property) notFound();

  const checkIn = property.check_in_time ?? siteConfig.defaults.checkInTime;
  const checkOut = property.check_out_time ?? siteConfig.defaults.checkOutTime;
  const facts = [
    { icon: "users", text: `Sleeps ${property.max_guests}` },
    { icon: "bed", text: `${plural(property.bedrooms, "bedroom")} · ${plural(property.beds, "bed")}` },
    { icon: "bath", text: `${formatBaths(property.bathrooms)} ${property.bathrooms === 1 ? "bathroom" : "bathrooms"}` },
  ];

  return (
    <article className="container-page pb-28 pt-8 lg:pb-20">
      <PropertyJsonLd property={property} checkInTime={checkIn} checkOutTime={checkOut} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
        <Link href="/properties" className="underline underline-offset-4 hover:text-ink">All stays</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{property.name}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-4xl font-semibold leading-tight text-ink sm:text-5xl">{property.name}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-ink-soft">
          <Icon name="pin" className="h-4 w-4" />{property.location_label}
        </p>
      </header>

      <div className="mt-6">
        <Gallery photos={property.photos} name={property.name} />
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-12">
          <section aria-label="Overview">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-6 text-ink">
              {facts.map((f) => (
                <li key={f.icon} className="flex items-center gap-2"><Icon name={f.icon} className="h-5 w-5 text-primary" />{f.text}</li>
              ))}
            </ul>
            {property.tagline && <p className="mt-6 font-heading text-2xl leading-snug text-ink">{property.tagline}</p>}
            <RichText text={property.description} className="mt-4" />
          </section>

          {property.sleeping_arrangements.length > 0 && (
            <section aria-labelledby="sleeping-heading">
              <h2 id="sleeping-heading" className="text-3xl font-semibold text-ink">Where you’ll sleep</h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {property.sleeping_arrangements.map((room, i) => (
                  <li key={i} className="rounded-xl border border-line bg-surface p-5">
                    <Icon name="bed" className="h-6 w-6 text-primary" />
                    <p className="mt-3 font-semibold text-ink">{room.room}</p>
                    <p className="text-sm text-ink-soft">{room.beds}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {property.amenities.length > 0 && (
            <section aria-labelledby="amenities-heading">
              <h2 id="amenities-heading" className="text-3xl font-semibold text-ink">What this home offers</h2>
              <div className="mt-5 grid gap-8 sm:grid-cols-2">
                {groupAmenities(property.amenities).map(([category, list]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-ink-soft" style={{ fontFamily: "var(--brand-font-body)" }}>{category}</h3>
                    <ul className="mt-3 space-y-2.5">
                      {list.map((a) => (
                        <li key={a.id} className="flex items-center gap-3 text-ink">
                          <Icon name={a.icon} className="h-5 w-5 shrink-0 text-primary" />{a.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="rules-heading">
            <h2 id="rules-heading" className="text-3xl font-semibold text-ink">House rules</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-surface p-5">
                <dt className="flex items-center gap-2 text-sm text-ink-soft"><Icon name="clock" className="h-4 w-4" />Check-in</dt>
                <dd className="mt-1 font-semibold text-ink">After {formatTime(checkIn)}</dd>
              </div>
              <div className="rounded-xl border border-line bg-surface p-5">
                <dt className="flex items-center gap-2 text-sm text-ink-soft"><Icon name="clock" className="h-4 w-4" />Check-out</dt>
                <dd className="mt-1 font-semibold text-ink">Before {formatTime(checkOut)}</dd>
              </div>
              <div className="rounded-xl border border-line bg-surface p-5">
                <dt className="flex items-center gap-2 text-sm text-ink-soft"><Icon name="paw" className="h-4 w-4" />Pets</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {property.pets_allowed
                    ? property.pet_fee_cents > 0 ? `Welcome (${formatMoney(property.pet_fee_cents)} fee)` : "Welcome"
                    : "Not allowed"}
                </dd>
              </div>
            </dl>
            <RichText text={property.house_rules?.trim() || content.house_rules} className="mt-5" />
            <p className="mt-4 text-sm text-ink-soft">
              See our <Link href="/policies#cancellation" className="text-primary underline underline-offset-4">cancellation policy</Link>.
            </p>
          </section>

          {property.latitude !== null && property.longitude !== null && (
            <section aria-labelledby="location-heading">
              <h2 id="location-heading" className="text-3xl font-semibold text-ink">Where you’ll be</h2>
              <div className="mt-5">
                <MapEmbed latitude={property.latitude} longitude={property.longitude} label={property.location_label} />
              </div>
            </section>
          )}
        </div>

        <aside id="book" aria-label="Availability and booking" className="scroll-mt-24 lg:sticky lg:top-24 lg:h-fit">
          <BookingWidget
            property={{
              id: property.id,
              slug: property.slug,
              name: property.name,
              max_guests: property.max_guests,
              min_nights: property.min_nights,
              max_nights: property.max_nights,
              booking_window_days: property.booking_window_days,
              min_advance_days: property.min_advance_days,
              base_price_cents: property.base_price_cents,
              weekend_price_cents: property.weekend_price_cents,
              weekend_days: property.weekend_days,
              cleaning_fee_cents: property.cleaning_fee_cents,
              pets_allowed: property.pets_allowed,
              pet_fee_cents: property.pet_fee_cents,
              tax_rate_percent: Number(property.tax_rate_percent),
              inquiry_only: property.inquiry_only,
            }}
            pricingRules={property.pricing_rules}
            timezone={siteConfig.timezone}
            demoMode={isDemoMode()}
          />
        </aside>
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <p className="text-ink">
            <span className="text-sm text-ink-soft">From </span>
            <span className="text-lg font-semibold">{formatMoney(startingPrice(property))}</span>
            <span className="text-sm text-ink-soft"> / night</span>
          </p>
          <a href="#book" className="btn-primary">{property.inquiry_only ? "Request dates" : "Check availability"}</a>
        </div>
      </div>
    </article>
  );
}
