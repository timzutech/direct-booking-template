import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { RichText } from "@/components/rich-text";
import { getContent } from "@/lib/data";

export const metadata: Metadata = {
  title: "Policies",
  description: "Cancellation policy, house rules, terms and privacy.",
  alternates: { canonical: "/policies" },
};

export default async function PoliciesPage() {
  const content = await getContent();
  const sections = [
    { id: "cancellation", title: "Cancellation policy", text: content.cancellation_policy },
    { id: "house-rules", title: "House rules", text: content.house_rules },
    { id: "terms", title: "Booking terms", text: content.terms },
    { id: "privacy", title: "Privacy", text: content.privacy },
  ];
  return (
    <>
      <PageIntro eyebrow="The small print" title="Policies">
        Clear and fair, so there are no surprises.
      </PageIntro>
      <div className="container-page grid gap-10 pb-20 lg:grid-cols-[220px_1fr]">
        <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:h-fit">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm lg:flex-col">
            {sections.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className="text-primary underline underline-offset-4">{s.title}</a></li>
            ))}
          </ul>
        </nav>
        <div className="max-w-2xl space-y-12">
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`} className="scroll-mt-24">
              <h2 id={`${s.id}-heading`} className="text-3xl font-semibold text-ink">{s.title}</h2>
              <RichText text={s.text} className="mt-4" />
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
