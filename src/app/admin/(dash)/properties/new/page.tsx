import type { Metadata } from "next";
import Link from "next/link";
import { PropertyForm } from "@/components/admin/property-form";
import { PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Add property" };

export default async function NewPropertyPage() {
  await requireAdmin();
  return (
    <>
      <PageTitle title="Add property">
        <Link href="/admin/properties" className="text-sm text-primary underline underline-offset-4">Back to properties</Link>
      </PageTitle>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft">Start with the basics. After saving you can add photos, amenities, seasonal prices and calendar links.</p>
      <PropertyForm property={null} amenities={[]} selectedAmenityIds={[]} />
    </>
  );
}
