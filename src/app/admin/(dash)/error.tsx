"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="card p-8">
      <h1 className="text-3xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 text-ink-soft">{error.message || "This page could not be loaded."}</p>
      <button type="button" onClick={reset} className="btn-primary mt-5">Try again</button>
    </div>
  );
}
