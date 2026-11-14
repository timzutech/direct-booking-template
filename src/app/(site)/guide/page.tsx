import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { PageIntro } from "@/components/page-intro";
import { getGuideItems } from "@/lib/data";
import type { GuideCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Local guide",
  description: "Our favourite places to eat, things to do and local tips for your stay.",
  alternates: { canonical: "/guide" },
};

const sections: { category: GuideCategory; title: string; blurb: string }[] = [
  { category: "restaurant", title: "Eat & drink", blurb: "Where we send friends." },
  { category: "activity", title: "Things to do", blurb: "Slow mornings and good days out." },
  { category: "tip", title: "Good to know", blurb: "Small things that make a stay easier." },
];

export default async function GuidePage() {
  const items = await getGuideItems();
  return (
    <>
      <PageIntro eyebrow="Local guide" title="Our favourite places nearby">
        A short, honest list — the spots we return to ourselves.
      </PageIntro>
      <div className="container-page space-y-16 pb-20">
        {items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-soft">
            Our local guide is on its way.
          </p>
        )}
        {sections.map((section) => {
          const list = items.filter((item) => item.category === section.category);
          if (list.length === 0) return null;
          return (
            <section key={section.category} aria-labelledby={`guide-${section.category}`}>
              <h2 id={`guide-${section.category}`} className="text-3xl font-semibold text-ink sm:text-4xl">{section.title}</h2>
              <p className="mt-1 text-ink-soft">{section.blurb}</p>
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((item) => (
                  <li key={item.id} className="card flex flex-col p-6">
                    <h3 className="text-2xl font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{item.description}</p>
                    {item.address && (
                      <p className="mt-4 flex items-center gap-1.5 text-sm text-ink-soft">
                        <Icon name="pin" className="h-4 w-4 shrink-0" />{item.address}
                      </p>
                    )}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4">
                        Visit website<span className="sr-only"> for {item.title} (opens in a new tab)</span>
                        <Icon name="external" className="h-4 w-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
