import { requireAdmin } from "@/lib/admin/auth";
import { toCsv } from "@/lib/admin/csv";
import { loadGuests } from "@/lib/admin/guests";
import { minorUnitFactor } from "@/lib/format";

/** CSV download of the guest list (admin only). ?only=opted-in limits it to marketing opt-ins. */
export async function GET(request: Request) {
  const { db } = await requireAdmin();
  const onlyOptedIn = new URL(request.url).searchParams.get("only") === "opted-in";
  const guests = (await loadGuests(db)).filter((g) => !onlyOptedIn || g.marketing_opt_in);
  const factor = minorUnitFactor();

  const csv = toCsv(
    ["Name", "Email", "Phone", "Marketing opt-in", "Confirmed stays", "Last stay", "Total spent", "First seen"],
    guests.map((g) => [
      g.name, g.email, g.phone ?? "", g.marketing_opt_in ? "yes" : "no", g.confirmed_stays,
      g.last_stay ?? "", (g.total_spent_cents / factor).toFixed(factor === 1 ? 0 : 2), g.created_at.slice(0, 10),
    ]),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="guests-${onlyOptedIn ? "marketing-" : ""}${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
