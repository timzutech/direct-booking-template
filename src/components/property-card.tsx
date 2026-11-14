import Link from "next/link";
import { Icon } from "@/components/icons";
import { Photo } from "@/components/photo";
import { formatBaths, formatMoney, plural } from "@/lib/format";
import { startingPrice } from "@/lib/pricing";
import type { PropertyWithPhotos } from "@/lib/types";

export function PropertyCard({
  property, priority = false, headingLevel = "h3",
}: { property: PropertyWithPhotos; priority?: boolean; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const cover = property.photos[0];
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {cover && (
          <Photo
            src={cover.url}
            alt={cover.alt || `${property.name} — main photo`}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        {property.inquiry_only && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-ink">
            By request
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <Icon name="pin" className="h-4 w-4" />
          {property.location_label}
        </p>
        <Heading className="mt-1.5 text-2xl font-semibold text-ink">
          <Link href={`/properties/${property.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {property.name}
          </Link>
        </Heading>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          <li className="flex items-center gap-1.5"><Icon name="users" className="h-4 w-4" />{plural(property.max_guests, "guest")}</li>
          <li className="flex items-center gap-1.5"><Icon name="bed" className="h-4 w-4" />{plural(property.bedrooms, "bedroom")}</li>
          <li className="flex items-center gap-1.5"><Icon name="bath" className="h-4 w-4" />{formatBaths(property.bathrooms)} {property.bathrooms === 1 ? "bath" : "baths"}</li>
        </ul>
        <p className="mt-auto pt-4 text-ink">
          <span className="text-sm text-ink-soft">From </span>
          <span className="text-lg font-semibold">{formatMoney(startingPrice(property))}</span>
          <span className="text-sm text-ink-soft"> / night</span>
        </p>
      </div>
    </article>
  );
}
