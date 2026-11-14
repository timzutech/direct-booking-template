import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "../../../../site.config";
import { PageIntro } from "@/components/page-intro";
import { RichText } from "@/components/rich-text";
import { getContent } from "@/lib/data";

export const metadata: Metadata = {
  title: "About us",
  description: `Meet the hosts behind ${siteConfig.name}.`,
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const content = await getContent();
  return (
    <>
      <PageIntro eyebrow="About us" title={`The people behind ${siteConfig.shortName}`} />
      <div className="container-page grid gap-12 pb-20 lg:grid-cols-[1.5fr_1fr]">
        <RichText text={content.about} className="text-lg" />
        <aside className="card h-fit p-7">
          <h2 className="text-2xl font-semibold text-ink">Book direct, stay better</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            No platform fees, live availability and a direct line to your hosts.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <Link href="/properties" className="btn-primary">Browse our stays</Link>
            <Link href="/contact" className="btn-outline">Get in touch</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
