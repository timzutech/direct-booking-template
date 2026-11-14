import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { PropertyCard } from "@/components/property-card";
import { getProperties } from "@/lib/data";

export const metadata: Metadata = {
  title: "Our stays",
  description: "Browse our holiday homes, check live availability and book direct for the best rate.",
  alternates: { canonical: "/properties" },
};

export default async function PropertiesPage() {
  const properties = await getProperties();
  return (
    <>
      <PageIntro eyebrow="Our homes" title="Find your stay">
        Every home is looked after by us personally. Prices shown are per night, before cleaning and taxes.
      </PageIntro>
      <div className="container-page pb-20">
        {properties.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-soft">
            Our homes will be listed here soon. Please check back shortly.
          </p>
        ) : (
          <ul className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property, i) => (
              <li key={property.id} className="contents">
                <PropertyCard property={property} priority={i < 3} headingLevel="h2" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
