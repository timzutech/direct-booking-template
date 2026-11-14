import type { Metadata } from "next";
import { siteConfig } from "../../../../site.config";
import { ContactForm } from "@/components/contact-form";
import { Icon } from "@/components/icons";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Contact",
  description: `Questions about a stay? Get in touch with ${siteConfig.name}.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const { email, phone, address } = siteConfig.contact;
  return (
    <>
      <PageIntro eyebrow="Contact" title="We would love to hear from you">
        Questions about a home, dates or a special occasion? Send us a note — a real person will reply.
      </PageIntro>
      <div className="container-page grid gap-12 pb-20 lg:grid-cols-[1.5fr_1fr]">
        <ContactForm />
        <aside className="card h-fit space-y-5 p-7">
          <h2 className="text-2xl font-semibold text-ink">Reach us directly</h2>
          <ul className="space-y-4 text-ink-soft">
            <li>
              <a href={`mailto:${email}`} className="flex items-center gap-3 hover:text-ink">
                <Icon name="mail" className="h-5 w-5 text-primary" />{email}
              </a>
            </li>
            {phone && (
              <li>
                <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-3 hover:text-ink">
                  <Icon name="phone" className="h-5 w-5 text-primary" />{phone}
                </a>
              </li>
            )}
            {address && (
              <li className="flex items-center gap-3"><Icon name="pin" className="h-5 w-5 text-primary" />{address}</li>
            )}
          </ul>
        </aside>
      </div>
    </>
  );
}
