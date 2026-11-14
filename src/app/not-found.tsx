import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="container-page flex flex-1 flex-col items-start justify-center py-24">
      <p className="eyebrow">Page not found</p>
      <h1 className="mt-2 text-5xl font-semibold text-ink">We can’t find that page.</h1>
      <p className="mt-4 max-w-md text-ink-soft">It may have moved, or the link may be out of date.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-primary">Back to home</Link>
        <Link href="/properties" className="btn-outline">Browse stays</Link>
      </div>
    </main>
  );
}
