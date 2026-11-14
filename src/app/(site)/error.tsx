"use client";

import { useEffect } from "react";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex flex-col items-start py-24">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-2 text-4xl font-semibold text-ink sm:text-5xl">We hit a snag loading this page.</h1>
      <p className="mt-4 max-w-md text-ink-soft">Please try again. If the problem continues, get in touch and we will help directly.</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn-primary">Try again</button>
        <a href="/contact" className="btn-outline">Contact us</a>
      </div>
    </div>
  );
}
