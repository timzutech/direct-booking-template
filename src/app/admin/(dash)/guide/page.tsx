import type { Metadata } from "next";
import { deleteGuideItem, saveGuideItem } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageTitle, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import type { GuideItem } from "@/lib/types";

export const metadata: Metadata = { title: "Local guide" };

const sections = [
  { value: "restaurant", label: "Eat & drink" },
  { value: "activity", label: "Things to do" },
  { value: "tip", label: "Good to know" },
];

function Fields({ item }: { item: GuideItem | null }) {
  const id = item?.id ?? "new";
  return (
    <>
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor={`g-cat-${id}`} className="label">Section</label>
          <select id={`g-cat-${id}`} name="category" defaultValue={item?.category ?? "restaurant"} className="field">
            {sections.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div><label htmlFor={`g-title-${id}`} className="label">Title</label><input id={`g-title-${id}`} name="title" required defaultValue={item?.title} className="field" /></div>
        <div><label htmlFor={`g-address-${id}`} className="label">Address</label><input id={`g-address-${id}`} name="address" defaultValue={item?.address ?? ""} placeholder="Optional" className="field" /></div>
        <div><label htmlFor={`g-url-${id}`} className="label">Website</label><input id={`g-url-${id}`} name="url" type="url" defaultValue={item?.url ?? ""} placeholder="https://… (optional)" className="field" /></div>
      </div>
      <div className="mt-4"><label htmlFor={`g-desc-${id}`} className="label">Description</label><textarea id={`g-desc-${id}`} name="description" rows={2} defaultValue={item?.description} className="field" /></div>
      <div className="mt-3 flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2.5 text-sm text-ink">
          <input type="checkbox" name="is_published" defaultChecked={item?.is_published ?? true} className="h-5 w-5 accent-[var(--brand-primary)]" />Show on the website
        </label>
        <div className="flex items-center gap-2"><label htmlFor={`g-order-${id}`} className="text-sm text-ink">Order</label><input id={`g-order-${id}`} name="sort_order" type="number" defaultValue={item?.sort_order ?? 0} className="field w-24" /></div>
      </div>
    </>
  );
}

export default async function AdminGuidePage() {
  const { db } = await requireAdmin();
  const { data, error } = await db.from("guide_items").select("*").order("category").order("sort_order").order("created_at");
  if (error) throw new Error("The local guide could not be loaded.");
  const items = data as GuideItem[];

  return (
    <div className="space-y-6">
      <PageTitle title="Local guide" />
      <Panel title="Add an entry" description="Restaurants, activities and tips shown on the Local guide page.">
        <ActionForm action={saveGuideItem} resetOnSuccess>
          <Fields item={null} />
          <SubmitButton className="mt-4" pendingText="Adding…">Add entry</SubmitButton>
        </ActionForm>
      </Panel>
      {sections.map((section) => {
        const list = items.filter((i) => i.category === section.value);
        if (list.length === 0) return null;
        return (
          <div key={section.value} className="space-y-4">
            <h2 className="text-2xl font-semibold text-ink">{section.label}</h2>
            {list.map((item) => (
              <section key={item.id} aria-label={item.title} className="card p-5 sm:p-6">
                <ActionForm action={saveGuideItem}>
                  <Fields item={item} />
                  <SubmitButton className="mt-4">Save</SubmitButton>
                </ActionForm>
                <ActionForm action={deleteGuideItem} confirm={`Delete “${item.title}”?`} className="mt-2">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" className="min-h-9 text-sm font-medium text-danger underline underline-offset-4">Delete</button>
                </ActionForm>
              </section>
            ))}
          </div>
        );
      })}
    </div>
  );
}
