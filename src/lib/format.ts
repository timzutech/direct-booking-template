import { siteConfig } from "../../site.config";

/** Number of minor units in one major unit of the site currency (100 for USD, 1 for JPY). */
export function minorUnitFactor(currency: string = siteConfig.currency): number {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits ?? 2;
  return 10 ** digits;
}

/** Formats an amount in minor units, e.g. 28500 → "$285". Cents are shown only when needed. */
export function formatMoney(minor: number, opts: { currency?: string; alwaysCents?: boolean } = {}): string {
  const currency = opts.currency ?? siteConfig.currency;
  const factor = minorUnitFactor(currency);
  const whole = minor % factor === 0 && !opts.alwaysCents;
  return new Intl.NumberFormat(siteConfig.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : undefined,
    maximumFractionDigits: whole ? 0 : undefined,
  }).format(minor / factor);
}

/** "2026-03-14" → "Sat, Mar 14, 2026" (date-only, no timezone shifting). */
export function formatDate(iso: string, style: "short" | "long" = "short"): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(siteConfig.locale, {
    weekday: style === "long" ? "long" : "short",
    month: style === "long" ? "long" : "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "16:00" → "4:00 PM" in the site locale. */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  return new Intl.DateTimeFormat(siteConfig.locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, 0, 1, h, m || 0)),
  );
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(siteConfig.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: siteConfig.timezone,
  }).format(new Date(iso));
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** 2 → "2", 1.5 → "1.5" */
export function formatBaths(n: number): string {
  return Number(n).toString();
}
