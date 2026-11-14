// End-to-end calendar sync test. Same prerequisites as e2e-booking.mjs, plus CRON_SECRET=local-cron-secret.
import pg from "pg";

const APP = "http://localhost:3000", MOCK = "http://localhost:12111", CRON = "local-cron-secret";
const db = new pg.Client("postgresql://postgres:postgres@127.0.0.1:54322/postgres");
await db.connect();
let pass = 0, failed = 0;
const ok = (cond, name, extra = "") => { if (cond) pass++; else failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  → " + extra}`); };
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const c = (iso) => iso.replace(/-/g, "");
const ics = (events) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Airbnb Inc//Hosting Calendar//EN\r\n${events.map(([s, e, uid]) => `BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:${c(s)}\r\nDTEND;VALUE=DATE:${c(e)}\r\nUID:${uid}\r\nSUMMARY:Reserved\r\nEND:VEVENT\r\n`).join("")}END:VCALENDAR\r\n`;
const setFeed = (name, f) => fetch(`${MOCK}/set-feed/${name}`, { method: "POST", body: JSON.stringify(f) });
const cron = async (auth = `Bearer ${CRON}`) => { const r = await fetch(`${APP}/api/cron/sync-calendars`, { headers: auth ? { authorization: auth } : {} }); return { status: r.status, body: await r.json() }; };
const blocks = (feedId) => q("select start_date::text s, end_date::text e, external_uid uid from blocked_dates where feed_id=$1 order by start_date", [feedId]);
const feedRow = async (id) => (await q("select * from ical_feeds where id=$1", [id]))[0];

const [cabin] = await q("select * from properties where slug='heron-lake-cabin'");
await q("delete from ical_feeds where name like 'e2e%'");
await q("delete from bookings where guest_email like '%@e2e.test'");
const base = 120;
await setFeed("airbnb", { body: ics([[day(base), day(base + 4), "a1@airbnb.com"], [day(base + 10), day(base + 12), "a2@airbnb.com"], [day(-30), day(-25), "old@airbnb.com"]]) });
await setFeed("vrbo", { body: ics([[day(base + 20), day(base + 27), "v1@vrbo.com"]]) });
const [airbnb] = await q("insert into ical_feeds (property_id, name, url) values ($1,'e2e Airbnb',$2) returning id", [cabin.id, `${MOCK}/feed/airbnb.ics`]);
const [vrbo] = await q("insert into ical_feeds (property_id, name, url) values ($1,'e2e Vrbo',$2) returning id", [cabin.id, `${MOCK}/feed/vrbo.ics`]);

ok((await cron(null)).status === 401 && (await cron("Bearer wrong")).status === 401, "cron endpoint rejects missing or wrong secret");
ok((await blocks(airbnb.id)).length === 0, "…and imports nothing");

let run = await cron();
ok(run.status === 200 && run.body.feeds === 2 && run.body.synced === 2 && run.body.failed.length === 0, "cron run syncs both feeds", JSON.stringify(run.body));
let a = await blocks(airbnb.id);
ok(a.length === 2 && a[0].s === day(base) && a[0].e === day(base + 4) && a[0].uid === "a1@airbnb.com", "Airbnb reservations imported as blocked dates (past ones dropped)", JSON.stringify(a));
ok((await blocks(vrbo.id)).length === 1, "Vrbo reservation imported");
let f = await feedRow(airbnb.id);
ok(f.last_status === "ok" && f.last_event_count === 2 && Date.now() - new Date(f.last_synced_at) < 60000, "feed records last synced time and status");

const avail = await (await fetch(`${APP}/api/availability/${cabin.id}`)).json();
ok(avail.ranges.some((r) => r.start === day(base - 1) && r.end === day(base + 5)), "imported dates block the public calendar, with the buffer day", JSON.stringify(avail.ranges));
const book = await fetch(`${APP}/api/bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: cabin.id, checkIn: day(base + 2), checkOut: day(base + 6), guests: 2, name: "E2E Guest", email: "ical@e2e.test", phone: "5550001111", acceptTerms: true }) });
ok(book.status === 409, "direct booking over imported dates is refused");

// feed changes: a1 cancelled, a3 added
await setFeed("airbnb", { body: ics([[day(base + 10), day(base + 12), "a2@airbnb.com"], [day(base + 40), day(base + 43), "a3@airbnb.com"]]) });
await cron();
a = await blocks(airbnb.id);
ok(a.length === 2 && a.map((x) => x.uid).join() === "a2@airbnb.com,a3@airbnb.com", "re-sync replaces blocks: cancelled stay freed, new stay blocked", JSON.stringify(a));
ok((await blocks(vrbo.id)).length === 1, "other feed's blocks untouched");

// failures keep existing blocks
await setFeed("airbnb", { status: 500, body: "oops" });
run = await cron();
f = await feedRow(airbnb.id);
ok(run.body.synced === 1 && run.body.failed.length === 1 && f.last_status === "error" && /500/.test(f.last_error), "HTTP error is recorded on the feed", JSON.stringify(run.body));
ok((await blocks(airbnb.id)).length === 2, "…and existing blocks are kept (dates stay protected)");
await setFeed("airbnb", { body: "<html>Please log in</html>", type: "text/html" });
await cron();
f = await feedRow(airbnb.id);
ok(f.last_status === "error" && /not an iCal/.test(f.last_error) && (await blocks(airbnb.id)).length === 2, "HTML/garbage response is treated as an error, blocks kept", f.last_error);
await q("update ical_feeds set url='http://localhost:9/nothing.ics' where id=$1", [vrbo.id]);
await cron();
ok((await feedRow(vrbo.id)).last_status === "error" && (await blocks(vrbo.id)).length === 1, "unreachable server is an error, blocks kept");
await setFeed("airbnb", { body: ics([]) });
await cron();
ok((await feedRow(airbnb.id)).last_status === "ok" && (await blocks(airbnb.id)).length === 0, "a valid but empty calendar clears that feed's blocks");

// stale holds are tidied by the cron
await q("insert into bookings (reference, property_id, status, check_in, check_out, guests_count, guest_name, guest_email, currency, expires_at) values ('BK-E2ESTALE',$1,'pending',$2,$3,2,'Stale','stale@e2e.test','USD', now() - interval '5 minutes')", [cabin.id, day(base + 60), day(base + 63)]);
run = await cron();
ok(run.body.expiredBookings >= 1 && (await q("select status from bookings where reference='BK-E2ESTALE'"))[0].status === "expired", "cron marks stale pending bookings as expired");

// export feed
await q("insert into bookings (reference, property_id, status, check_in, check_out, guests_count, guest_name, guest_email, currency, expires_at) values ('BK-E2EPEND',$1,'pending',$2,$3,2,'Secret Name','pending@e2e.test','USD', now() + interval '20 minutes')", [cabin.id, day(base + 70), day(base + 73)]);
await setFeed("airbnb", { body: ics([[day(base + 80), day(base + 83), "a9@airbnb.com"]]) });
await cron();
const res = await fetch(`${APP}/api/ical/${cabin.id}.ics`);
const text = await res.text();
const seeded = (await q("select check_in::text ci, check_out::text co from bookings where property_id=$1 and status='confirmed' and guest_email='sample.guest@example.com'", [cabin.id]))[0];
const minus1 = (iso) => new Date(new Date(iso).getTime() - 86400000).toISOString().slice(0, 10);
const plus1 = (iso) => new Date(new Date(iso).getTime() + 86400000).toISOString().slice(0, 10);
ok(res.status === 200 && res.headers.get("content-type").startsWith("text/calendar") && text.startsWith("BEGIN:VCALENDAR"), "export feed is served as text/calendar");
ok(text.includes(`DTSTART;VALUE=DATE:${c(minus1(seeded.ci))}\r\nDTEND;VALUE=DATE:${c(plus1(seeded.co))}`), "export contains the confirmed direct booking, padded by the buffer day");
const manual = await q("select start_date::text s from blocked_dates where property_id=$1 and source='manual'", [cabin.id]);
ok(manual.length > 0 && manual.every((m) => text.includes(`DTSTART;VALUE=DATE:${c(m.s)}`)), "export contains manual blocks");
ok(!text.includes(c(day(base + 80))), "export does NOT contain imported Airbnb blocks (no echo loop)");
ok(!text.includes(c(day(base + 70))) && !/Secret Name|Sample Guest|@e2e|example\.com/.test(text), "export has no pending holds and no guest details");
ok((await fetch(`${APP}/api/ical/00000000-0000-0000-0000-000000000000.ics`)).status === 404 && (await fetch(`${APP}/api/ical/garbage`)).status === 404, "unknown property or malformed URL → 404");

// our own feed imported elsewhere and echoed back is ignored
await setFeed("vrbo", { body: text });
await q("update ical_feeds set url=$2 where id=$1", [vrbo.id, `${MOCK}/feed/vrbo.ics`]);
await cron();
ok((await feedRow(vrbo.id)).last_status === "ok" && (await blocks(vrbo.id)).length === 0, "our own events echoed back by a platform are ignored");

await q("delete from ical_feeds where name like 'e2e%'");
await q("delete from bookings where guest_email like '%@e2e.test'");
await db.end();
console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
