import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { formatMoney } from "@/lib/format";
import type { Property } from "@/lib/types";

export const metadata: Metadata = { title: "Properties" };

export default async function AdminPropertiesPage() {
  const { db } = await requireAdmin();
  const { data, error } = await db.from("properties").select("*").order("sort_order").order("name");
  if (error) throw new Error("Properties could not be loaded.");
  const properties = data as Property[];

  return (
    <>
      <PageTitle title="Properties">
        <Link href="/admin/properties/new" className="btn-primary">Add property</Link>
      </PageTitle>
      {properties.length === 0 ? (
        <p className="card p-8 text-center text-ink-soft">No properties yet. Add your first one to get started.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {properties.map((p) => (
            <li key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">{p.name}</h2>
                  <p className="text-sm text-ink-soft">{p.location_label || "No location set"} · from {formatMoney(p.base_price_cents)} / night</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                  <span className={`rounded-full px-2.5 py-0.5 ${p.is_published ? "bg-emerald-100 text-emerald-900" : "bg-stone-200 text-stone-800"}`}>{p.is_published ? "Published" : "Hidden"}</span>
                  {p.inquiry_only && <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-900">Inquiry only</span>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
                <Link href={`/admin/properties/${p.id}`} className="text-primary underline underline-offset-4">Edit details</Link>
                <Link href={`/admin/properties/${p.id}/calendar`} className="text-primary underline underline-offset-4">Calendar</Link>
                {p.is_published && <Link href={`/properties/${p.slug}`} className="text-primary underline underline-offset-4">View on website</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
