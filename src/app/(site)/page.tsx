import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "../../../site.config";
import { Icon } from "@/components/icons";
import { Photo } from "@/components/photo";
import { BusinessJsonLd } from "@/components/property-json-ld";
import { PropertyCard } from "@/components/property-card";
import { Stars } from "@/components/stars";
import { getProperties, getTestimonials } from "@/lib/data";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const reasons = [
  { icon: "tag", title: "No platform fees", text: "Listing sites add a service fee of up to 15% to every stay. Book with us and that money stays in your pocket." },
  { icon: "heart", title: "Talk to your actual hosts", text: "Questions, early check-in, a birthday surprise — you deal directly with the people who look after the home." },
  { icon: "shield", title: "Secure payment", text: "Pay by card through Stripe, the same payment provider trusted by millions of businesses." },
  { icon: "calendar", title: "Live availability", text: "Our calendar is always up to date, so the dates you see are the dates you can book." },
];

export default async function HomePage() {
  const [properties, testimonials] = await Promise.all([getProperties(), getTestimonials()]);
  const featured = properties.filter((p) => p.is_featured);
  const shown = (featured.length > 0 ? featured : properties).slice(0, 3);

  return (
    <>
      <BusinessJsonLd />
      {/* Hero */}
      <section className="relative isolate flex min-h-[72vh] items-end overflow-hidden bg-primary sm:min-h-[80vh]">
        <Photo
          src={siteConfig.heroImage}
          alt={siteConfig.heroImageAlt}
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/25 to-black/10" aria-hidden="true" />
        <div className="container-page pb-14 pt-32 text-white sm:pb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/85">{siteConfig.name}</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
            {siteConfig.tagline}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/90">{siteConfig.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/properties" className="btn-light">Explore our stays</Link>
            <Link href="/contact" className="btn border border-white/60 text-white hover:bg-white/10">Ask us anything</Link>
          </div>
        </div>
      </section>

      {/* Featured properties */}
      <section aria-labelledby="featured-heading" className="container-page py-16 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Our homes</p>
            <h2 id="featured-heading" className="mt-2 text-4xl font-semibold text-ink sm:text-5xl">Places to stay</h2>
          </div>
          {properties.length > shown.length && (
            <Link href="/properties" className="text-sm font-medium text-primary underline underline-offset-4">
              View all {properties.length} stays
            </Link>
          )}
        </div>
        {shown.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center text-ink-soft">
            Our homes will be listed here soon.
          </p>
        ) : (
          <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((property) => <PropertyCard key={property.id} property={property} />)}
          </div>
        )}
      </section>

      {/* Why book direct */}
      <section aria-labelledby="direct-heading" className="bg-muted">
        <div className="container-page py-16 sm:py-24">
          <p className="eyebrow">Why book direct</p>
          <h2 id="direct-heading" className="mt-2 max-w-2xl text-4xl font-semibold text-ink sm:text-5xl">
            The same home, a better price, and a real person to talk to.
          </h2>
          <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((reason) => (
              <li key={reason.title}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-primary shadow-card">
                  <Icon name={reason.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-2xl font-semibold text-ink">{reason.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{reason.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section aria-labelledby="reviews-heading" className="container-page py-16 sm:py-24">
          <p className="eyebrow">Guest stories</p>
          <h2 id="reviews-heading" className="mt-2 text-4xl font-semibold text-ink sm:text-5xl">Kind words from past guests</h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {testimonials.slice(0, 4).map((t) => (
              <li key={t.id} className="card flex flex-col p-7">
                <Stars rating={t.rating} />
                <blockquote className="mt-4 flex-1 font-heading text-2xl leading-snug text-ink">“{t.quote}”</blockquote>
                <p className="mt-5 text-sm text-ink-soft">
                  <span className="font-semibold text-ink">{t.guest_name}</span>
                  {t.guest_location && <> · {t.guest_location}</>}
                  {t.stay_label && <> · {t.stay_label}</>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Call to action */}
      <section aria-labelledby="cta-heading" className="bg-primary text-primary-fg">
        <div className="container-page flex flex-col items-start gap-6 py-16 sm:py-20 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="cta-heading" className="text-4xl font-semibold sm:text-5xl">Ready when you are.</h2>
            <p className="mt-3 max-w-xl opacity-90">Check live availability and book in a couple of minutes — or send us a note and we will help you plan.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/properties" className="btn-light">Check availability</Link>
            <Link href="/contact" className="btn border border-current hover:bg-white/10">Contact us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
