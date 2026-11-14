import type { Metadata } from "next";
import { saveContent } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Note, PageTitle, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { contentDefaults } from "@/lib/data";
import type { ContentKey } from "@/lib/types";

export const metadata: Metadata = { title: "Policies & text" };

const blocks: { key: ContentKey; title: string; where: string; rows: number }[] = [
  { key: "cancellation_policy", title: "Cancellation policy", where: "Policies page", rows: 7 },
  { key: "house_rules", title: "House rules", where: "Policies page and every property page (unless the property has its own rules)", rows: 7 },
  { key: "terms", title: "Booking terms", where: "Policies page", rows: 7 },
  { key: "privacy", title: "Privacy", where: "Policies page", rows: 7 },
  { key: "about", title: "About us", where: "About page", rows: 9 },
];

export default async function AdminPoliciesPage() {
  const { db } = await requireAdmin();
  const { data, error } = await db.from("site_content").select("key, value");
  if (error) throw new Error("The texts could not be loaded.");
  const saved = new Map(data.map((row) => [row.key as string, row.value as string]));

  return (
    <div className="space-y-6">
      <PageTitle title="Policies & text" />
      <Note>Leave a blank line between paragraphs. Start lines with “- ” to make a bulleted list. Clear a box and save to go back to the original text.</Note>
      {blocks.map((block) => (
        <Panel key={block.key} title={block.title} description={`Shown on: ${block.where}.${saved.has(block.key) ? "" : " Currently using the original text."}`}>
          <ActionForm action={saveContent}>
            <input type="hidden" name="key" value={block.key} />
            <label htmlFor={`content-${block.key}`} className="sr-only">{block.title}</label>
            <textarea id={`content-${block.key}`} name="value" rows={block.rows} defaultValue={saved.get(block.key) ?? contentDefaults[block.key]} className="field" />
            <SubmitButton className="mt-3">Save {block.title.toLowerCase()}</SubmitButton>
          </ActionForm>
        </Panel>
      ))}
    </div>
  );
}
