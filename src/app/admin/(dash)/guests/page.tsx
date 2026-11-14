import type { Metadata } from "next";
import { Note, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { loadGuests } from "@/lib/admin/guests";
import { formatDate, formatMoney, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Guests" };

export default async function AdminGuestsPage() {
  const { db } = await requireAdmin();
  const guests = await loadGuests(db);
  const optedIn = guests.filter((g) => g.marketing_opt_in).length;

  return (
    <>
      <PageTitle title="Guests">
        <div className="flex flex-wrap gap-3">
          <a href="/admin/guests/export?only=opted-in" className="btn-primary" download>Export marketing list (CSV)</a>
          <a href="/admin/guests/export" className="btn-outline" download>Export all guests (CSV)</a>
        </div>
      </PageTitle>
      <div className="mb-6">
        <Note>
          {plural(guests.length, "guest")} · {optedIn} opted in to marketing emails. Only email guests who opted in for promotions — the marketing list export contains just those guests.
        </Note>
      </div>
      {guests.length === 0 ? (
        <p className="card p-8 text-center text-ink-soft">Guests appear here after their first booking or request.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">Guest list</caption>
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3">Guest</th>
                <th scope="col" className="px-4 py-3">Phone</th>
                <th scope="col" className="px-4 py-3">Marketing</th>
                <th scope="col" className="px-4 py-3">Stays</th>
                <th scope="col" className="px-4 py-3">Last stay</th>
                <th scope="col" className="px-4 py-3 text-right">Total spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {guests.map((g) => (
                <tr key={g.email}>
                  <th scope="row" className="px-4 py-3 font-normal">
                    <span className="font-medium text-ink">{g.name}</span><br />
                    <a href={`mailto:${g.email}`} className="text-primary underline underline-offset-4">{g.email}</a>
                  </th>
                  <td className="px-4 py-3 text-ink-soft">{g.phone ?? "—"}</td>
                  <td className="px-4 py-3">{g.marketing_opt_in ? <span className="font-medium text-success">Opted in</span> : <span className="text-ink-soft">No</span>}</td>
                  <td className="px-4 py-3 tabular-nums text-ink">{g.confirmed_stays}</td>
                  <td className="px-4 py-3 text-ink-soft">{g.last_stay ? formatDate(g.last_stay) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">{formatMoney(g.total_spent_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
