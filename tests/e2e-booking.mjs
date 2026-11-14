// End-to-end booking engine test. Needs: local Supabase (seeded), the app on :3000
// started with STRIPE_API_BASE_URL / RESEND_BASE_URL pointing at a local mock on :12111,
// and STRIPE_WEBHOOK_SECRET=whsec_testsecret. See README → "Testing".
import Stripe from "stripe";
import pg from "pg";

const APP = "http://localhost:3000", MOCK = "http://localhost:12111", SECRET = "whsec_testsecret";
const db = new pg.Client("postgresql://postgres:postgres@127.0.0.1:54322/postgres");
await db.connect();
const stripe = new Stripe("sk_test_mock");
let pass = 0, failed = 0;
const ok = (cond, name, extra = "") => { if (cond) pass++; else failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  → " + extra}`); };
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const mockLog = async () => (await fetch(`${MOCK}/log`)).json();
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const [cabin] = await q("select * from properties where slug='heron-lake-cabin'");
const [loft] = await q("select * from properties where slug='the-foundry-loft'");
await q("delete from bookings where guest_email like '%@e2e.test'");
await q("delete from blocked_dates where summary = 'e2e'");
await fetch(`${MOCK}/reset`);

const guest = (n = 1) => ({ name: `E2E Guest ${n}`, email: `guest${n}@e2e.test`, phone: "+1 555 000 0000", message: "hello", acceptTerms: true, marketingOptIn: true });
const book = async (body) => { const r = await fetch(`${APP}/api/bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, ...(await r.json()) }; };
const webhook = async (type, object, { badSig = false } = {}) => {
  const payload = JSON.stringify({ id: "evt_" + Math.random().toString(36).slice(2), object: "event", type, data: { object } });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: badSig ? "whsec_wrong" : SECRET });
  const r = await fetch(`${APP}/api/stripe/webhook`, { method: "POST", headers: { "stripe-signature": header }, body: payload });
  return r.status;
};
const paid = (b) => ({ id: b.stripe_session_id, object: "checkout.session", payment_status: "paid", payment_intent: "pi_" + b.id.slice(0, 8), metadata: { booking_id: b.id }, client_reference_id: b.id });
const bookingBy = async (ref) => (await q("select * from bookings where reference=$1", [ref]))[0];

// Find a clear weekday-start window far from seeded data: 60+ days out, starting on a Monday.
let start = 60; while (new Date(day(start)).getUTCDay() !== 1) start++;
const A = { propertyId: cabin.id, checkIn: day(start), checkOut: day(start + 3), guests: 2, pets: false };

// --- validation -------------------------------------------------------------
ok((await book({ ...A, ...guest(), acceptTerms: false })).status === 400, "rejects when terms not accepted");
ok((await book({ ...A, ...guest(), checkOut: day(start + 1) })).code === "MIN_NIGHTS", "rejects below minimum nights");
ok((await book({ ...A, ...guest(), guests: 9 })).code === "TOO_MANY_GUESTS", "rejects too many guests");
ok((await book({ ...A, ...guest(), checkIn: day(-3), checkOut: day(0) })).code === "TOO_SOON", "rejects dates in the past");
ok((await book({ ...A, ...guest(), checkIn: day(400), checkOut: day(403) })).code === "TOO_FAR", "rejects beyond the booking window");
ok((await book({ ...A, ...guest(), email: "nope" })).status === 400, "rejects invalid email");
ok((await book({ ...A, ...guest(), expectedTotalCents: 100 })).code === "PRICE_CHANGED", "rejects a tampered total (server recomputes price)");
ok((await q("select count(*)::int c from bookings where guest_email like '%@e2e.test'"))[0].c === 0, "no booking rows created by rejected requests");

// --- happy path -------------------------------------------------------------
const r1 = await book({ ...A, ...guest(1) });
ok(r1.status === 200 && r1.type === "checkout" && r1.url.includes("/pay/cs_test_"), "valid request returns a Stripe Checkout URL", JSON.stringify(r1));
let b1 = await bookingBy(r1.reference);
const expected = 3 * 28500 + 15000; const tax = Math.round(expected * 0.08);
ok(b1.status === "pending" && b1.total_cents === expected + tax && b1.tax_cents === tax, "booking saved as pending with server-computed total", `${b1.status} ${b1.total_cents}`);
const holdMin = (new Date(b1.expires_at) - Date.now()) / 60000;
ok(holdMin > 29.5 && holdMin < 30.5, "hold expires after 30 minutes", holdMin.toFixed(2));
let log = await mockLog();
const sess = log.find((l) => l.url === "/v1/checkout/sessions").params;
const lineTotal = Object.entries(sess).filter(([k]) => k.endsWith("[unit_amount]")).reduce((s, [, v]) => s + Number(v), 0);
ok(lineTotal === b1.total_cents && sess["line_items[0][price_data][currency]"] === "usd", "Stripe line items add up to the booking total", String(lineTotal));
ok(Math.abs(Number(sess.expires_at) * 1000 - new Date(b1.expires_at).getTime()) < 1000 && sess["metadata[booking_id]"] === b1.id, "Stripe session expires with the hold and carries the booking id");
ok((await q("select marketing_opt_in from guests where email='guest1@e2e.test'"))[0]?.marketing_opt_in === true, "guest saved to the guest list");

// --- double-booking prevention ---------------------------------------------
ok((await book({ ...A, ...guest(2) })).code === "DATES_UNAVAILABLE", "same dates are held: second guest is refused");
ok((await book({ ...A, ...guest(2), checkIn: day(start + 2), checkOut: day(start + 5) })).code === "DATES_UNAVAILABLE", "overlapping dates refused");
ok((await book({ ...A, ...guest(2), checkIn: day(start + 3), checkOut: day(start + 6) })).code === "DATES_UNAVAILABLE", "buffer day enforced (check-in on previous checkout day refused)");
const adj = await book({ ...A, ...guest(2), checkIn: day(start + 4), checkOut: day(start + 7) });
ok(adj.status === 200, "dates after the buffer day are bookable", JSON.stringify(adj));
const avail = await (await fetch(`${APP}/api/availability/${cabin.id}`)).json();
ok(avail.ranges.some((r) => r.start === day(start - 1) && r.end === day(start + 4)), "public availability shows the hold (with buffer), no guest data", JSON.stringify(avail.ranges));

// --- webhook ----------------------------------------------------------------
await fetch(`${MOCK}/reset`);
ok((await webhook("checkout.session.completed", paid(b1), { badSig: true })) === 400, "webhook with a bad signature is rejected");
ok((await bookingBy(r1.reference)).status === "pending", "…and changes nothing");
ok((await webhook("checkout.session.completed", { ...paid(b1), payment_status: "unpaid" })) === 200 && (await bookingBy(r1.reference)).status === "pending", "unpaid completed session does not confirm");
ok((await webhook("checkout.session.completed", paid(b1))) === 200, "signed paid webhook accepted");
b1 = await bookingBy(r1.reference);
ok(b1.status === "confirmed" && b1.confirmed_at && b1.expires_at === null && b1.stripe_payment_intent_id, "booking marked confirmed");
log = await mockLog();
const emails = log.filter((l) => l.url === "/emails").map((l) => l.json);
ok(emails.length === 2 && emails.some((e) => e.to.includes("guest1@e2e.test")) && emails.some((e) => e.to.includes("hello@example.com")), "confirmation emails sent to guest and host", JSON.stringify(emails.map((e) => e.to)));
ok(emails.every((e) => e.html.includes(b1.reference)) && emails[0].subject.length > 10, "emails contain the booking reference");
ok((await webhook("checkout.session.completed", paid(b1))) === 200 && (await mockLog()).filter((l) => l.url === "/emails").length === 2, "webhook replay is idempotent (no duplicate emails)");
const page = await (await fetch(`${APP}/booking/success?session_id=${b1.stripe_session_id}`)).text();
ok(page.includes("you’re booked") && page.includes(b1.reference), "confirmation page shows the confirmed booking");
ok(!(await (await fetch(`${APP}/booking/success?session_id=cs_test_doesnotexist00`)).text()).includes("BK-"), "confirmation page reveals nothing for an unknown session id");

// --- conflict: dates taken (e.g. by an iCal import) before payment lands ------
await fetch(`${MOCK}/reset`);
const C = { ...A, checkIn: day(start + 14), checkOut: day(start + 17) };
const r3 = await book({ ...C, ...guest(3) });
let b3 = await bookingBy(r3.reference);
await q("insert into blocked_dates (property_id, start_date, end_date, source, summary) values ($1,$2,$3,'manual','e2e')", [cabin.id, day(start + 15), day(start + 16)]);
ok((await webhook("checkout.session.completed", paid(b3))) === 200, "paid webhook for conflicting dates accepted");
b3 = await bookingBy(r3.reference);
log = await mockLog();
ok(b3.status === "conflict" && b3.refunded_at, "booking marked conflict, not confirmed", b3.status);
ok(log.filter((l) => l.url === "/v1/refunds").length === 1 && log.find((l) => l.url === "/v1/refunds").params.payment_intent === b3.stripe_payment_intent_id, "payment refunded automatically");
ok(log.filter((l) => l.url === "/emails").length === 2, "guest and host told about the conflict");
ok((await webhook("checkout.session.completed", paid(b3))) === 200 && (await mockLog()).filter((l) => l.url === "/v1/refunds").length === 1, "conflict replay does not refund twice");

// --- expiry -----------------------------------------------------------------
const D = { ...A, checkIn: day(start + 28), checkOut: day(start + 31) };
const r4 = await book({ ...D, ...guest(4) });
let b4 = await bookingBy(r4.reference);
ok((await webhook("checkout.session.expired", { id: b4.stripe_session_id, object: "checkout.session", payment_status: "unpaid", metadata: { booking_id: b4.id } })) === 200 && (await bookingBy(r4.reference)).status === "expired", "expired Stripe session marks the booking expired");
const r5 = await book({ ...D, ...guest(5) });
ok(r5.status === 200, "expired booking frees the dates");
await q("update bookings set expires_at = now() - interval '1 minute' where reference=$1", [r5.reference]);
const r6 = await book({ ...D, ...guest(6) });
ok(r6.status === 200, "a hold older than 30 minutes no longer blocks the dates");
const b5 = await bookingBy(r5.reference);
await webhook("checkout.session.completed", paid(b5));
ok((await bookingBy(r5.reference)).status === "conflict", "late payment on a lapsed hold cannot double-book (conflict + refund)");
await q("update bookings set expires_at = now() - interval '1 minute' where reference=$1", [r6.reference]);
const b6 = await bookingBy(r6.reference);
await webhook("checkout.session.completed", paid(b6));
ok((await bookingBy(r6.reference)).status === "confirmed", "late payment is honoured when the dates are still free");

// --- release on Stripe 'back' ------------------------------------------------
const E = { ...A, checkIn: day(start + 42), checkOut: day(start + 45) };
const r7 = await book({ ...E, ...guest(7) });
const b7 = await bookingBy(r7.reference);
const rel = await fetch(`${APP}/api/bookings/${b7.id}/release`, { redirect: "manual" });
ok(rel.status >= 300 && rel.status < 400 && rel.headers.get("location").includes("/properties/heron-lake-cabin?checkout=cancelled"), "cancel link redirects back to the property");
ok((await bookingBy(r7.reference)).status === "cancelled" && (await mockLog()).some((l) => l.url.endsWith("/expire")), "…releases the hold and expires the Stripe session");
ok((await fetch(`${APP}/api/bookings/${b1.id}/release`, { redirect: "manual" })).status < 400 && (await bookingBy(r1.reference)).status === "confirmed", "release link cannot cancel a confirmed booking");

// --- concurrency ------------------------------------------------------------
const F = { ...A, checkIn: day(start + 56), checkOut: day(start + 59) };
const race = await Promise.all(Array.from({ length: 10 }, (_, i) => book({ ...F, ...guest(20 + i) })));
ok(race.filter((r) => r.status === 200).length === 1 && race.filter((r) => r.code === "DATES_UNAVAILABLE").length === 9, "10 simultaneous requests for the same dates → exactly 1 succeeds", JSON.stringify(race.map((r) => r.status)));

// --- Stripe outage ----------------------------------------------------------
await fetch(`${MOCK}/fail-next/checkout`);
const G = { ...A, checkIn: day(start + 70), checkOut: day(start + 73) };
const r8 = await book({ ...G, ...guest(8) });
ok(r8.status === 502 && r8.code === "PAYMENT_UNAVAILABLE", "Stripe failure returns a clear error", JSON.stringify(r8));
ok((await book({ ...G, ...guest(8) })).status === 200, "…and does not leave the dates stuck on hold");

// --- inquiry-only property ---------------------------------------------------
await fetch(`${MOCK}/reset`);
const I = { propertyId: loft.id, checkIn: day(start), checkOut: day(start + 3), guests: 2, pets: false };
const r9 = await book({ ...I, ...guest(9) });
const b9 = await bookingBy(r9.reference);
log = await mockLog();
ok(r9.status === 200 && r9.type === "inquiry" && b9.status === "inquiry" && !b9.stripe_session_id, "inquiry-only property saves a request, no payment", JSON.stringify(r9));
ok(!log.some((l) => l.url.startsWith("/v1/")) && log.filter((l) => l.url === "/emails").length === 2, "inquiry emails sent to guest and host; Stripe not called");
ok((await book({ ...I, ...guest(10) })).status === 200, "an inquiry does not block the dates");

await db.end();
console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
