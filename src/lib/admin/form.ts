import { minorUnitFactor } from "@/lib/format";

/** Result shape returned by every admin server action. */
export type ActionState = { ok: boolean; message: string } | null;

export const done = (message: string): ActionState => ({ ok: true, message });
export const failed = (message: string): ActionState => ({ ok: false, message });

export const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
export const optionalText = (form: FormData, name: string) => text(form, name) || null;
export const checked = (form: FormData, name: string) => form.get(name) === "on";

export function integer(form: FormData, name: string, fallback: number): number {
  const n = Number.parseInt(text(form, name), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function decimal(form: FormData, name: string): number | null {
  const raw = text(form, name);
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** "285" or "285.50" (major units) → minor units; empty → null. */
export function money(form: FormData, name: string): number | null {
  const n = decimal(form, name);
  return n === null || n < 0 ? null : Math.round(n * minorUnitFactor());
}

/** Minor units → value for a money <input>. */
export function moneyInput(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "";
  const factor = minorUnitFactor();
  return factor === 1 ? String(minor) : (minor / factor).toFixed(2).replace(/\.00$/, "");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
