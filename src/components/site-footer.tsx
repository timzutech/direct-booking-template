import Link from "next/link";
import { siteConfig } from "../../site.config";
import { Icon } from "@/components/icons";
import { navLinks, Wordmark } from "@/components/site-header";

export function SiteFooter() {
  const socials = Object.entries(siteConfig.social).filter(([, url]) => url);
  return (
    <footer className="mt-auto border-t border-line bg-muted">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark className="text-ink" />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">{siteConfig.tagline}</p>
        </div>
        <nav aria-label="Footer">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[...navLinks, { href: "/policies", label: "Policies" }].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-ink-soft hover:text-ink">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink">Get in touch</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
            <li>
              <a href={`mailto:${siteConfig.contact.email}`} className="flex items-center gap-2 hover:text-ink">
                <Icon name="mail" className="h-4 w-4" />{siteConfig.contact.email}
              </a>
            </li>
            {siteConfig.contact.phone && (
              <li>
                <a href={`tel:${siteConfig.contact.phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 hover:text-ink">
                  <Icon name="phone" className="h-4 w-4" />{siteConfig.contact.phone}
                </a>
              </li>
            )}
            {socials.map(([network, url]) => (
              <li key={network}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 capitalize hover:text-ink">
                  <Icon name="external" className="h-4 w-4" />{network}<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-xs text-ink-soft">
          © {siteConfig.name}. Book direct for the best rate.
        </p>
      </div>
    </footer>
  );
}
