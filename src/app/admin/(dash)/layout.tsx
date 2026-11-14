import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { siteConfig } from "../../../../site.config";
import { signOut } from "../login/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: `%s | ${siteConfig.shortName} dashboard` },
  robots: { index: false, follow: false },
};

// The dashboard is private and always rendered per request for the signed-in host,
// so it is exempt from Next.js's "instant navigation" / static shell checks.
export const instant = false;

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/properties", label: "Properties" },
  { href: "/admin/guests", label: "Guests" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/guide", label: "Local guide" },
  { href: "/admin/policies", label: "Policies & text" },
];

function Loading() {
  return (
    <div className="container-page py-10" role="status" aria-label="Loading dashboard">
      <div className="skeleton h-9 w-56" />
      <div className="skeleton mt-6 h-72 w-full" />
    </div>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
          <Link href="/admin" className="font-heading text-xl font-semibold text-ink">{siteConfig.shortName} <span className="text-ink-soft">dashboard</span></Link>
          <div className="flex items-center gap-4 text-sm text-ink-soft">
            <Link href="/" className="underline underline-offset-4 hover:text-ink">View website</Link>
            <span className="hidden sm:inline">{user.email}</span>
            <form action={signOut}><button type="submit" className="font-medium text-primary underline underline-offset-4">Sign out</button></form>
          </div>
        </div>
        <AdminNav links={links} />
      </header>
      <main id="main" className="container-page flex-1 py-8">
        {children}
      </main>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
