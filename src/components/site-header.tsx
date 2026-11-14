import Link from "next/link";
import { siteConfig } from "../../site.config";
import { MobileNav } from "@/components/mobile-nav";
import { Photo } from "@/components/photo";

export const navLinks = [
  { href: "/properties", label: "Stays" },
  { href: "/guide", label: "Local guide" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Wordmark({ className = "" }: { className?: string }) {
  return siteConfig.logo ? (
    <Photo src={siteConfig.logo} alt={siteConfig.name} width={180} height={48} className={`h-10 w-auto ${className}`} priority />
  ) : (
    <span className={`font-heading text-2xl font-semibold tracking-tight ${className}`}>{siteConfig.shortName}</span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/90 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg">
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label={`${siteConfig.name} — home`} className="text-ink">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-ink-soft transition-colors hover:text-ink">
              {link.label}
            </Link>
          ))}
          <Link href="/properties" className="btn-primary">Book your stay</Link>
        </nav>
        <MobileNav links={navLinks} />
      </div>
    </header>
  );
}
