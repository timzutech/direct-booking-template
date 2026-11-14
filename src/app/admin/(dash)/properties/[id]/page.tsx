import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig } from "../../../../../../site.config";
import { addAmenity, addIcalFeed, addPricingRule, deleteIcalFeed, deletePricingRule, deleteProperty, syncNow } from "../../../actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CopyField } from "@/components/admin/copy-field";
import { PhotoManager } from "@/components/admin/photo-manager";
import { PropertyForm } from "@/components/admin/property-form";
import { Note, PageTitle, Panel } from "@/components/admin/ui";
import { iconKeys } from "@/components/icons";
import { requireAdmin } from "@/lib/admin/auth";
import { siteUrl } from "@/lib/env";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { Amenity, IcalFeed, PricingRule, Property, PropertyPhoto } from "@/lib/types";

export const metadata: Metadata = { title: "Edit property" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditPropertyPage({ params, searchParams }: PageProps<"/admin/properties/[id]">) {
  const { db } = await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [property, photos, amenities, selected, rules, feeds] = await Promise.all([
    db.from("properties").select("*").eq("id", id).maybeSingle(),
    db.from("property_photos").select("*").eq("property_id", id).order("sort_order").order("created_at"),
    db.from("amenities").select("*").order("sort_order").order("name"),
    db.from("property_amenities").select("amenity_id").eq("property_id", id),
    db.from("pricing_rules").select("*").eq("property_id", id).order("start_date"),
    db.from("ical_feeds").select("*").eq("property_id", id).order("created_at"),
  ]);
  if (property.error || photos.error || amenities.error || selected.error || rules.error || feeds.error) {
    throw new Error("The property could not be loaded.");
  }
  if (!property.data) notFound();
  const p = property.data as Property;
  const created = (await searchParams).created === "1";
  const exportUrl = `${siteUrl()}/api/ical/${p.id}.ics`;
  const currency = siteConfig.currency;

  return (
    <div className="space-y-6">
      <PageTitle title={p.name}>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
          <Link href="/admin/properties" className="text-primary underline underline-offset-4">All properties</Link>
          <Link href={`/admin/properties/${p.id}/calendar`} className="text-primary underline underline-offset-4">Calendar</Link>
          {p.is_published && <Link href={`/properties/${p.slug}`} className="text-primary underline underline-offset-4">View on website</Link>}
        </div>
      </PageTitle>
      {created && <Note>Property created. Add photos, amenities and calendar links below, then tick “Published” when it is ready.</Note>}

      <Panel title="Photos" description="The first photo is the cover. Use Earlier / Later to change the order.">
        <PhotoManager propertyId={p.id} photos={photos.data as PropertyPhoto[]} />
      </Panel>

      <PropertyForm property={p} amenities={amenities.data as Amenity[]} selectedAmenityIds={selected.data.map((s) => s.amenity_id as string)} />

      <Panel title="Add an amenity to the list" description="Missing something above? Add it here, then tick it and save the property.">
        <ActionForm action={addAmenity} resetOnSuccess className="grid items-end gap-4 sm:grid-cols-4">
          <input type="hidden" name="property_id" value={p.id} />
          <div><label htmlFor="amenity-name" className="label">Name</label><input id="amenity-name" name="name" required className="field" /></div>
          <div><label htmlFor="amenity-category" className="label">Group</label><input id="amenity-category" name="category" defaultValue="Extras" className="field" /></div>
          <div>
            <label htmlFor="amenity-icon" className="label">Icon</label>
            <select id="amenity-icon" name="icon" defaultValue="check" className="field">
              {iconKeys.filter((k) => !["menu", "close", "chevron-left", "chevron-right", "external"].includes(k)).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <SubmitButton variant="outline" pendingText="Adding…">Add amenity</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel title="Seasonal prices" description="Optional price periods that override the normal nightly price, for example summer or holidays. If two periods overlap, the higher priority wins.">
        {(rules.data as PricingRule[]).length > 0 && (
          <ul className="mb-5 divide-y divide-line">
            {(rules.data as PricingRule[]).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{r.name}</p>
                  <p className="text-ink-soft">
                    {formatDate(r.start_date)} – {formatDate(r.end_date)} · {formatMoney(r.nightly_price_cents)} / night
                    {r.weekend_price_cents !== null && ` · ${formatMoney(r.weekend_price_cents)} weekends`}
                    {r.min_nights !== null && ` · ${r.min_nights} night minimum`}
                    {r.priority !== 0 && ` · priority ${r.priority}`}
                  </p>
                </div>
                <ActionForm action={deletePricingRule} confirm={`Delete the “${r.name}” price period?`}>
                  <input type="hidden" name="id" value={r.id} /><input type="hidden" name="property_id" value={p.id} />
                  <button type="submit" className="min-h-9 text-sm font-medium text-danger underline underline-offset-4">Delete</button>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={addPricingRule} resetOnSuccess className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="property_id" value={p.id} />
          <div><label htmlFor="rule-name" className="label">Name</label><input id="rule-name" name="name" required placeholder="Summer" className="field" /></div>
          <div><label htmlFor="rule-start" className="label">First night</label><input id="rule-start" name="start_date" type="date" required className="field" /></div>
          <div><label htmlFor="rule-end" className="label">Last night</label><input id="rule-end" name="end_date" type="date" required className="field" /></div>
          <div><label htmlFor="rule-nightly" className="label">Nightly price ({currency})</label><input id="rule-nightly" name="nightly_price" inputMode="decimal" required className="field" /></div>
          <div><label htmlFor="rule-weekend" className="label">Weekend price ({currency})</label><input id="rule-weekend" name="weekend_price" inputMode="decimal" placeholder="Optional" className="field" /></div>
          <div><label htmlFor="rule-min" className="label">Minimum nights</label><input id="rule-min" name="min_nights" type="number" min={1} placeholder="Optional" className="field" /></div>
          <div><label htmlFor="rule-priority" className="label">Priority</label><input id="rule-priority" name="priority" type="number" defaultValue={0} className="field" /></div>
          <SubmitButton variant="outline" pendingText="Adding…">Add price period</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel id="calendars" title="Calendar sync" description="Keep this calendar and your Airbnb, Vrbo or Booking.com calendars in step, in both directions.">
        <Note tone="warning">
          <strong>Good to know:</strong> we import your other calendars every 30 minutes, but Airbnb and Vrbo re-read <em>your</em> export calendar on their own schedule — anywhere from 30 minutes to several hours. A booking made here is therefore not blocked there instantly. We recommend at least <strong>1 buffer day</strong> (currently {p.buffer_days}) and some advance notice to keep the risk of a double booking very low.
        </Note>

        <h3 className="mt-6 text-xl font-semibold text-ink">1. Import: block dates booked elsewhere</h3>
        <p className="mt-1 text-sm text-ink-soft">Paste the calendar export link from each platform (Airbnb: Calendar → Availability → Connect calendars → Export).</p>
        {(feeds.data as IcalFeed[]).length > 0 && (
          <ul className="mt-3 divide-y divide-line">
            {(feeds.data as IcalFeed[]).map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{f.name}</p>
                  <p className="truncate text-ink-soft">{f.url}</p>
                  <p className={f.last_status === "error" ? "text-danger" : "text-ink-soft"}>
                    {f.last_synced_at ? `Last synced ${formatDateTime(f.last_synced_at)}` : "Not synced yet"}
                    {f.last_status === "error" ? ` — failed: ${f.last_error}. Previously imported dates stay blocked.` : f.last_event_count !== null ? ` · ${f.last_event_count} blocked stays` : ""}
                  </p>
                </div>
                <ActionForm action={deleteIcalFeed} confirm={`Remove the ${f.name} calendar? Its imported dates will be unblocked.`}>
                  <input type="hidden" name="id" value={f.id} /><input type="hidden" name="property_id" value={p.id} />
                  <button type="submit" className="min-h-9 text-sm font-medium text-danger underline underline-offset-4">Remove</button>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={addIcalFeed} resetOnSuccess className="mt-3 grid items-end gap-4 sm:grid-cols-[12rem_1fr_auto]">
          <input type="hidden" name="property_id" value={p.id} />
          <div><label htmlFor="feed-name" className="label">Platform</label><input id="feed-name" name="name" required placeholder="Airbnb" className="field" /></div>
          <div><label htmlFor="feed-url" className="label">Calendar link (iCal)</label><input id="feed-url" name="url" type="url" required placeholder="https://www.airbnb.com/calendar/ical/…" className="field" /></div>
          <SubmitButton variant="outline" pendingText="Importing…">Add calendar</SubmitButton>
        </ActionForm>
        <ActionForm action={syncNow} className="mt-4">
          <input type="hidden" name="property_id" value={p.id} />
          <SubmitButton variant="outline" pendingText="Syncing…">Sync now</SubmitButton>
        </ActionForm>

        <h3 className="mt-8 text-xl font-semibold text-ink">2. Export: block your direct bookings elsewhere</h3>
        <p className="mb-3 mt-1 text-sm text-ink-soft">
          Paste this link into Airbnb and Vrbo (“Import calendar”). It contains your confirmed direct bookings, including buffer days, and your manually blocked dates — never guest names.
        </p>
        <CopyField label="Your export calendar link" value={exportUrl} />
      </Panel>

      <Panel title="Delete property" description="Permanently removes the property, its photos, prices and calendar links. Properties with bookings cannot be deleted — unpublish them instead.">
        <ActionForm action={deleteProperty} confirm={`Permanently delete “${p.name}”? This cannot be undone.`}>
          <input type="hidden" name="id" value={p.id} />
          <SubmitButton variant="danger" pendingText="Deleting…">Delete this property</SubmitButton>
        </ActionForm>
      </Panel>
    </div>
  );
}
