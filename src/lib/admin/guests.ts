import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type GuestSummary = {
  name: string;
  email: string;
  phone: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  confirmed_stays: number;
  last_stay: string | null;
  total_spent_cents: number;
};

/** Guest list with stay totals, newest first. `db` must be an admin session client. */
export async function loadGuests(db: SupabaseClient): Promise<GuestSummary[]> {
  const { data, error } = await db
    .from("guests")
    .select("name, email, phone, marketing_opt_in, created_at, bookings(status, check_out, total_cents)")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(`Guests could not be loaded: ${error.message}`);

  return data.map((g) => {
    const stays = (g.bookings as { status: string; check_out: string; total_cents: number }[]).filter((b) => b.status === "confirmed");
    return {
      name: g.name,
      email: g.email,
      phone: g.phone,
      marketing_opt_in: g.marketing_opt_in,
      created_at: g.created_at,
      confirmed_stays: stays.length,
      last_stay: stays.map((b) => b.check_out).sort().at(-1) ?? null,
      total_spent_cents: stays.reduce((sum, b) => sum + b.total_cents, 0),
    };
  });
}
