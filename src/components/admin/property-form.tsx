import { siteConfig } from "../../../site.config";
import { saveProperty } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { moneyInput } from "@/lib/admin/form";
import type { Amenity, Property } from "@/lib/types";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Field({
  label, name, hint, className = "", ...input
}: { label: string; name: string; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `property-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={name} className="field" aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

function Area({ label, name, hint, rows = 4, defaultValue }: { label: string; name: string; hint?: string; rows?: number; defaultValue?: string }) {
  const id = `property-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <textarea id={id} name={name} rows={rows} defaultValue={defaultValue} className="field" aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

function Check({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 text-sm text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-primary)]" />
      <span>{label}{hint && <span className="block text-xs text-ink-soft">{hint}</span>}</span>
    </label>
  );
}

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="card p-5 sm:p-6">
    <legend className="float-left mb-4 w-full text-2xl font-semibold text-ink font-heading">{title}</legend>
    <div className="clear-both grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  </fieldset>
);

export function PropertyForm({
  property: p, amenities, selectedAmenityIds,
}: { property: Property | null; amenities: Amenity[]; selectedAmenityIds: string[] }) {
  const currency = siteConfig.currency;
  const categories = [...new Set(amenities.map((a) => a.category))];
  const weekendDays = p?.weekend_days ?? [5, 6];

  return (
    <ActionForm action={saveProperty} className="space-y-6">
      {p && <input type="hidden" name="id" value={p.id} />}

      <Group title="Basics">
        <Field label="Name" name="name" required defaultValue={p?.name} className="sm:col-span-2" />
        <Field label="URL name" name="slug" defaultValue={p?.slug} hint="Used in the web address, e.g. lake-cabin. Leave empty to create it from the name." className="sm:col-span-2" />
        <Field label="One-line summary" name="tagline" defaultValue={p?.tagline ?? ""} className="sm:col-span-2 lg:col-span-4" />
        <div className="sm:col-span-2 lg:col-span-4">
          <Area label="Description" name="description" rows={7} defaultValue={p?.description} hint="Leave a blank line between paragraphs." />
        </div>
        <Field label="Location shown publicly" name="location_label" defaultValue={p?.location_label} hint="Town and region, e.g. Lake Placid, New York" className="sm:col-span-2" />
        <Field label="Full address" name="address" defaultValue={p?.address ?? ""} hint="Only sent to guests in their confirmation email." className="sm:col-span-2" />
        <Field label="Latitude" name="latitude" inputMode="decimal" defaultValue={p?.latitude ?? ""} hint="For the map, e.g. 44.2795" />
        <Field label="Longitude" name="longitude" inputMode="decimal" defaultValue={p?.longitude ?? ""} hint="e.g. -73.9799" />
      </Group>

      <Group title="Space">
        <Field label="Maximum guests" name="max_guests" type="number" min={1} required defaultValue={p?.max_guests ?? 2} />
        <Field label="Bedrooms" name="bedrooms" type="number" min={0} defaultValue={p?.bedrooms ?? 1} />
        <Field label="Beds" name="beds" type="number" min={0} defaultValue={p?.beds ?? 1} />
        <Field label="Bathrooms" name="bathrooms" type="number" min={0} step={0.5} defaultValue={p?.bathrooms ?? 1} />
        <div className="sm:col-span-2 lg:col-span-4">
          <Area
            label="Sleeping arrangements"
            name="sleeping_arrangements"
            rows={4}
            hint="One room per line, written as “Room: beds”. Example — Primary bedroom: 1 king bed"
            defaultValue={(p?.sleeping_arrangements ?? []).map((r) => `${r.room}: ${r.beds}`).join("\n")}
          />
        </div>
      </Group>

      <Group title="Pricing">
        <Field label={`Nightly price (${currency})`} name="base_price" inputMode="decimal" required defaultValue={moneyInput(p?.base_price_cents)} />
        <Field label={`Weekend nightly price (${currency})`} name="weekend_price" inputMode="decimal" defaultValue={moneyInput(p?.weekend_price_cents)} hint="Optional. Leave empty to charge the same every night." />
        <Field label={`Cleaning fee (${currency})`} name="cleaning_fee" inputMode="decimal" defaultValue={moneyInput(p?.cleaning_fee_cents ?? 0)} />
        <Field label="Taxes (%)" name="tax_rate_percent" inputMode="decimal" defaultValue={p?.tax_rate_percent ?? 0} hint="Charged on nights, cleaning and pet fee." />
        <fieldset className="sm:col-span-2 lg:col-span-4">
          <legend className="label">Nights charged at the weekend price</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {weekdays.map((day, i) => (
              <label key={day} className="flex min-h-9 items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="weekend_days" value={i} defaultChecked={weekendDays.includes(i)} className="h-5 w-5 accent-[var(--brand-primary)]" />
                {day}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="sm:col-span-2"><Check label="Pets allowed" name="pets_allowed" defaultChecked={p?.pets_allowed} /></div>
        <Field label={`Pet fee per stay (${currency})`} name="pet_fee" inputMode="decimal" defaultValue={moneyInput(p?.pet_fee_cents ?? 0)} />
      </Group>

      <Group title="Booking rules">
        <Field label="Minimum nights" name="min_nights" type="number" min={1} defaultValue={p?.min_nights ?? 2} />
        <Field label="Maximum nights" name="max_nights" type="number" min={1} defaultValue={p?.max_nights ?? 30} />
        <Field label="Booking window (days)" name="booking_window_days" type="number" min={1} defaultValue={p?.booking_window_days ?? 365} hint="How far ahead guests can book." />
        <Field label="Advance notice (days)" name="min_advance_days" type="number" min={0} defaultValue={p?.min_advance_days ?? 1} hint="0 allows same-day bookings." />
        <Field label="Buffer days between stays" name="buffer_days" type="number" min={0} defaultValue={p?.buffer_days ?? 1} hint="Empty days kept before and after every stay. 1 or more is recommended when you also list on Airbnb or Vrbo." className="sm:col-span-2" />
        <Field label="Check-in time" name="check_in_time" type="time" defaultValue={p?.check_in_time ?? ""} hint={`Empty = site default (${siteConfig.defaults.checkInTime})`} />
        <Field label="Check-out time" name="check_out_time" type="time" defaultValue={p?.check_out_time ?? ""} hint={`Empty = site default (${siteConfig.defaults.checkOutTime})`} />
        <div className="sm:col-span-2 lg:col-span-4">
          <Check label="Inquiry only" name="inquiry_only" defaultChecked={p?.inquiry_only} hint="Guests send a request instead of paying online. Requests do not block the calendar." />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <Area label="House rules for this property" name="house_rules" rows={4} defaultValue={p?.house_rules ?? ""} hint="Optional. Leave empty to use the general house rules. Start lines with “- ” for a bulleted list." />
        </div>
      </Group>

      {p && (
        <fieldset className="card p-5 sm:p-6">
          <legend className="float-left mb-4 w-full font-heading text-2xl font-semibold text-ink">Amenities</legend>
          <div className="clear-both grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {amenities.length === 0 && <p className="text-sm text-ink-soft">No amenities yet — add some below.</p>}
            {categories.map((category) => (
              <div key={category}>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">{category}</p>
                <div className="mt-2 space-y-2">
                  {amenities.filter((a) => a.category === category).map((a) => (
                    <label key={a.id} className="flex items-center gap-2.5 text-sm text-ink">
                      <input type="checkbox" name="amenities" value={a.id} defaultChecked={selectedAmenityIds.includes(a.id)} className="h-5 w-5 accent-[var(--brand-primary)]" />
                      {a.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <Group title="Visibility">
        <div className="sm:col-span-2"><Check label="Published" name="is_published" defaultChecked={p?.is_published ?? false} hint="Visible on the website and bookable." /></div>
        <div className="sm:col-span-2"><Check label="Featured on the home page" name="is_featured" defaultChecked={p?.is_featured ?? false} /></div>
        <Field label="Display order" name="sort_order" type="number" defaultValue={p?.sort_order ?? 0} hint="Lower numbers appear first." />
      </Group>

      <div className="sticky bottom-0 -mx-1 flex items-center gap-4 border-t border-line bg-bg/95 px-1 py-3 backdrop-blur">
        <SubmitButton>{p ? "Save property" : "Create property"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
