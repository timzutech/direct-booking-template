import type { Metadata } from "next";
import { deleteTestimonial, saveTestimonial } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Note, PageTitle, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import type { Testimonial } from "@/lib/types";

export const metadata: Metadata = { title: "Testimonials" };

function Fields({ t }: { t: Testimonial | null }) {
  const id = t?.id ?? "new";
  return (
    <>
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><label htmlFor={`t-name-${id}`} className="label">Guest name</label><input id={`t-name-${id}`} name="guest_name" required defaultValue={t?.guest_name} placeholder="Maya R." className="field" /></div>
        <div><label htmlFor={`t-loc-${id}`} className="label">From</label><input id={`t-loc-${id}`} name="guest_location" defaultValue={t?.guest_location ?? ""} placeholder="Boston, MA" className="field" /></div>
        <div><label htmlFor={`t-stay-${id}`} className="label">Stay</label><input id={`t-stay-${id}`} name="stay_label" defaultValue={t?.stay_label ?? ""} placeholder="Lake Cabin, June 2025" className="field" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`t-rating-${id}`} className="label">Stars</label>
            <select id={`t-rating-${id}`} name="rating" defaultValue={t?.rating ?? 5} className="field">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </div>
          <div><label htmlFor={`t-order-${id}`} className="label">Order</label><input id={`t-order-${id}`} name="sort_order" type="number" defaultValue={t?.sort_order ?? 0} className="field" /></div>
        </div>
      </div>
      <div className="mt-4"><label htmlFor={`t-quote-${id}`} className="label">Their words</label><textarea id={`t-quote-${id}`} name="quote" required rows={3} defaultValue={t?.quote} className="field" /></div>
      <label className="mt-3 flex items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" name="is_published" defaultChecked={t?.is_published ?? true} className="h-5 w-5 accent-[var(--brand-primary)]" />Show on the website
      </label>
    </>
  );
}

export default async function AdminTestimonialsPage() {
  const { db } = await requireAdmin();
  const { data, error } = await db.from("testimonials").select("*").order("sort_order").order("created_at");
  if (error) throw new Error("Testimonials could not be loaded.");
  const testimonials = data as Testimonial[];

  return (
    <div className="space-y-6">
      <PageTitle title="Testimonials" />
      <Note>Type in reviews your guests have given you, with their permission. The first four published testimonials appear on the home page.</Note>
      <Panel title="Add a testimonial">
        <ActionForm action={saveTestimonial} resetOnSuccess>
          <Fields t={null} />
          <SubmitButton className="mt-4" pendingText="Adding…">Add testimonial</SubmitButton>
        </ActionForm>
      </Panel>
      {testimonials.map((t) => (
        <section key={t.id} aria-label={`Testimonial from ${t.guest_name}`} className="card p-5 sm:p-6">
          <ActionForm action={saveTestimonial}>
            <Fields t={t} />
            <SubmitButton className="mt-4">Save</SubmitButton>
          </ActionForm>
          <ActionForm action={deleteTestimonial} confirm={`Delete the testimonial from ${t.guest_name}?`} className="mt-2">
            <input type="hidden" name="id" value={t.id} />
            <button type="submit" className="min-h-9 text-sm font-medium text-danger underline underline-offset-4">Delete</button>
          </ActionForm>
        </section>
      ))}
    </div>
  );
}
