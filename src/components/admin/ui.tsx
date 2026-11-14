import type { BookingStatus } from "@/lib/types";

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-semibold text-ink">{title}</h1>
      {children}
    </div>
  );
}

export function Panel({ title, description, children, id }: { title: string; description?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} aria-label={title} className="card scroll-mt-6 p-5 sm:p-6">
      <h2 className="text-2xl font-semibold text-ink">{title}</h2>
      {description && <div className="mt-1 text-sm leading-relaxed text-ink-soft">{description}</div>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Note({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warning" }) {
  return (
    <div role="note" className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${tone === "warning" ? "border-amber-300 bg-amber-50 text-amber-950" : "border-line bg-muted text-ink"}`}>
      {children}
    </div>
  );
}

const statusStyles: Record<BookingStatus, string> = {
  confirmed: "bg-emerald-100 text-emerald-900",
  pending: "bg-amber-100 text-amber-900",
  inquiry: "bg-sky-100 text-sky-900",
  cancelled: "bg-stone-200 text-stone-800",
  expired: "bg-stone-200 text-stone-800",
  declined: "bg-stone-200 text-stone-800",
  conflict: "bg-red-100 text-red-900",
};

const statusLabels: Record<BookingStatus, string> = {
  confirmed: "Confirmed",
  pending: "Awaiting payment",
  inquiry: "Request",
  cancelled: "Cancelled",
  expired: "Expired",
  declined: "Declined",
  conflict: "Conflict (refunded)",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status]}`}>{statusLabels[status]}</span>;
}

export { statusLabels };
