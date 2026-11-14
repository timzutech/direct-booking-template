import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { siteConfig } from "../../site.config";
import { isDemoMode, siteUrl } from "@/lib/env";
import { resolveFonts } from "@/lib/fonts";
import "./globals.css";

const fonts = resolveFonts(siteConfig.fonts.heading, siteConfig.fonts.body);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${siteConfig.name} — ${siteConfig.tagline}`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    locale: siteConfig.locale.replace("-", "_"),
  },
  twitter: { card: "summary_large_image" },
  // Spec demos should never be indexed.
  robots: isDemoMode() ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  themeColor: siteConfig.colors.primary,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const c = siteConfig.colors;
  const brand = {
    "--brand-primary": c.primary,
    "--brand-primary-fg": c.primaryForeground,
    "--brand-accent": c.accent,
    "--brand-bg": c.background,
    "--brand-surface": c.surface,
    "--brand-muted": c.muted,
    "--brand-ink": c.ink,
    "--brand-ink-soft": c.inkSoft,
    "--brand-border": c.border,
    "--brand-font-heading": fonts.headingStack,
    "--brand-font-body": fonts.bodyStack,
  } as CSSProperties;

  return (
    <html data-scroll-behavior="smooth" lang={siteConfig.locale.split("-")[0]} className={`${fonts.className} h-full antialiased`} style={brand}>
      <body className="flex min-h-full flex-col">
        {isDemoMode() && (
          <div role="status" className="bg-ink px-4 py-1.5 text-center text-xs font-medium tracking-wide text-white">
            Preview site — online booking is not live yet
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
