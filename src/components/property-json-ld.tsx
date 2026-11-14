import { siteConfig } from "../../site.config";
import { siteUrl } from "@/lib/env";
import { minorUnitFactor } from "@/lib/format";
import { startingPrice } from "@/lib/pricing";
import type { PropertyFull } from "@/lib/types";

/** schema.org VacationRental structured data for a property page. */
export function PropertyJsonLd({ property, checkInTime, checkOutTime }: { property: PropertyFull; checkInTime: string; checkOutTime: string }) {
  const base = siteUrl();
  const url = `${base}/properties/${property.slug}`;
  const [locality, region] = property.location_label.split(",").map((part) => part.trim());
  const absolute = (src: string) => (src.startsWith("http") ? src : `${base}${src}`);

  const data = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    "@id": url,
    additionalType: "House",
    identifier: property.id,
    name: property.name,
    description: property.tagline ? `${property.tagline} ${property.description}`.slice(0, 1000) : property.description.slice(0, 1000),
    url,
    image: property.photos.map((photo) => absolute(photo.url)),
    brand: { "@type": "Brand", name: siteConfig.name },
    address: {
      "@type": "PostalAddress",
      ...(locality ? { addressLocality: locality } : {}),
      ...(region ? { addressRegion: region } : {}),
    },
    ...(property.latitude !== null && property.longitude !== null
      ? { latitude: Math.round(property.latitude * 100) / 100, longitude: Math.round(property.longitude * 100) / 100 }
      : {}),
    checkinTime: checkInTime,
    checkoutTime: checkOutTime,
    petsAllowed: property.pets_allowed,
    priceRange: `From ${(startingPrice(property) / minorUnitFactor()).toFixed(0)} ${siteConfig.currency} per night`,
    containsPlace: {
      "@type": "Accommodation",
      additionalType: "EntirePlace",
      occupancy: { "@type": "QuantitativeValue", value: property.max_guests },
      numberOfBedrooms: property.bedrooms,
      numberOfBathroomsTotal: Number(property.bathrooms),
      bed: property.sleeping_arrangements.map((room) => ({ "@type": "BedDetails", typeOfBed: room.beds, name: room.room })),
      amenityFeature: property.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a.name, value: true })),
    },
  };

  // "<" is escaped so content from the database can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** schema.org LodgingBusiness for the home page. */
export function BusinessJsonLd() {
  const base = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${base}/#business`,
    name: siteConfig.name,
    description: siteConfig.description,
    url: base,
    email: siteConfig.contact.email,
    ...(siteConfig.contact.phone ? { telephone: siteConfig.contact.phone } : {}),
    ...(siteConfig.logo ? { logo: `${base}${siteConfig.logo}` } : {}),
    image: siteConfig.heroImage.startsWith("http") ? siteConfig.heroImage : `${base}${siteConfig.heroImage}`,
    sameAs: Object.values(siteConfig.social).filter(Boolean),
    checkinTime: siteConfig.defaults.checkInTime,
    checkoutTime: siteConfig.defaults.checkOutTime,
    currenciesAccepted: siteConfig.currency,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
