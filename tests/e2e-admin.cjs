// Browser test of the admin dashboard. Needs the app on :3000, local Supabase (seeded),
// an admin created with: npm run create-admin -- host@example.com "local-admin-pass-1",
// and a mock iCal feed at http://localhost:12111/feed/admin.ics.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const os = require("os");

const APP = "http://localhost:3000";
let pass = 0, failed = 0;
const ok = (cond, name, extra = "") => { if (cond) pass++; else failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  → " + extra}`); };

(async () => {
  const shots = process.argv[2];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("dialog", (d) => d.accept());
  const status = (text) => page.getByRole("status").filter({ hasText: text }).first().waitFor({ timeout: 15000 });

  // --- auth -----------------------------------------------------------------
  await page.goto(`${APP}/admin`);
  ok(page.url().endsWith("/admin/login"), "signed-out visit to /admin goes to the login page");
  await page.getByLabel("Email").fill("host@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("alert").filter({ hasText: "do not match" }).waitFor();
  ok(true, "wrong password is refused with a clear message");
  await page.getByLabel("Email").fill("stranger@example.com");
  await page.getByLabel("Password").fill("stranger-pass-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("alert").filter({ hasText: "does not have access" }).waitFor();
  ok(page.url().includes("/admin/login"), "a non-admin account cannot enter the dashboard");
  await page.getByLabel("Email").fill("host@example.com");
  await page.getByLabel("Password").fill("local-admin-pass-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${APP}/admin`, { waitUntil: "commit" });
  await page.getByRole("heading", { name: "Overview" }).waitFor();
  ok(await page.getByText("Keep buffer days on.").isVisible(), "overview shows the Airbnb/Vrbo refresh note");
  if (shots) await page.screenshot({ path: `${shots}/admin_overview.png`, fullPage: true });

  // --- create a property -----------------------------------------------------
  await page.goto(`${APP}/admin/properties/new`);
  await page.locator("#property-name").fill("E2E Test Cottage");
  await page.getByLabel("Location shown publicly").fill("Testville, Vermont");
  await page.locator("#property-base_price").fill("199.50");
  await page.getByLabel(/^Cleaning fee/).fill("80");
  await page.getByLabel("Taxes (%)").fill("10");
  await page.getByRole("button", { name: "Create property" }).click();
  await page.waitForURL(/\/admin\/properties\/[0-9a-f-]{36}\?created=1/, { waitUntil: "commit" });
  const propertyId = page.url().match(/properties\/([0-9a-f-]{36})/)[1];
  ok(true, "property created and editor opened");
  await page.goto(page.url()); // fresh load: Next keeps the previous page's form hidden in the DOM after a soft navigation

  // edit: publish, amenities
  await page.getByLabel("Fast Wi-Fi").check();
  await page.getByLabel("Hot tub").check();
  await page.getByLabel("Published").check();
  await page.getByLabel("Buffer days between stays").fill("1");
  await page.getByRole("button", { name: "Save property" }).click();
  await status("Property saved.");
  ok(true, "property edited (amenities, published)");
  await page.locator("#property-base_price").fill("abc");
  await page.getByRole("button", { name: "Save property" }).click();
  await page.getByRole("alert").filter({ hasText: "nightly price" }).waitFor();
  ok(true, "validation error shown when the nightly price is missing");
  await page.reload();
  ok((await page.locator("#property-base_price").inputValue()) === "199.50" && (await page.getByLabel("Hot tub").isChecked()), "saved values persist after reload");

  // --- photos ----------------------------------------------------------------
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-"));
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  for (const n of ["front-porch.png", "kitchen.png"]) fs.writeFileSync(path.join(dir, n), png);
  fs.writeFileSync(path.join(dir, "notes.txt"), "not an image");
  await page.waitForLoadState("networkidle"); // let the page hydrate before using the file input
  await page.locator('input[type=file]').setInputFiles([path.join(dir, "front-porch.png"), path.join(dir, "kitchen.png")]);
  await page.getByText("Cover", { exact: true }).waitFor({ timeout: 20000 });
  await page.locator("ol > li").nth(1).waitFor();
  const alts = () => page.locator('ol > li input[name="alt"]').evaluateAll((els) => els.map((e) => e.value));
  ok((await alts()).join() === "front porch,kitchen", "two photos uploaded to storage, alt text prefilled", (await alts()).join());
  const imgSrc = await page.locator("ol > li img").first().getAttribute("src");
  ok(/property-photos|_next\/image/.test(imgSrc), "uploaded photo is displayed");
  await page.getByRole("button", { name: "Move photo 2 earlier" }).click();
  await page.waitForFunction(() => document.querySelector('ol > li input[name="alt"]').value === "kitchen");
  ok((await alts()).join() === "kitchen,front porch", "photos reordered");
  await page.locator('ol > li input[name="alt"]').first().fill("Sunny kitchen with oak counters");
  await page.locator("ol > li").first().getByRole("button", { name: "Save" }).click();
  await status("Description saved.");
  await page.getByRole("button", { name: "Delete photo 2" }).click();
  await page.waitForFunction(() => document.querySelectorAll("ol > li").length === 1);
  ok(true, "alt text edited and a photo deleted");
  await page.locator('input[type=file]').setInputFiles(path.join(dir, "notes.txt"));
  await page.getByRole("alert").filter({ hasText: "use a JPG" }).waitFor();
  ok(true, "non-image upload is rejected with a message");

  // --- seasonal price ----------------------------------------------------------
  await page.locator("#rule-name").fill("Peak");
  await page.locator("#rule-start").fill("2027-07-01");
  await page.locator("#rule-end").fill("2027-07-31");
  await page.locator("#rule-nightly").fill("300");
  await page.getByRole("button", { name: "Add price period" }).click();
  await status("Price period added.");
  ok(await page.getByText(/Jul 1, 2027 – .*Jul 31, 2027 · \$300 \/ night/).isVisible(), "seasonal price period added");

  // --- calendar feeds ----------------------------------------------------------
  ok(await page.getByText(/re-read your export calendar on their own schedule/).isVisible(), "property page shows the Airbnb/Vrbo refresh note");
  ok((await page.getByLabel("Your export calendar link").inputValue()) === `${APP}/api/ical/${propertyId}.ics`, "export iCal link shown");
  await page.getByLabel("Platform").fill("Airbnb");
  await page.getByLabel("Calendar link (iCal)").fill("http://localhost:12111/feed/admin.ics");
  await page.getByRole("button", { name: "Add calendar" }).click();
  await status("Calendar added and imported.");
  await page.getByText(/Last synced .* · 1 blocked stays/).waitFor();
  ok(true, "import feed added, first import ran, last-synced time shown");
  await page.getByRole("button", { name: "Sync now" }).click();
  await status("Synced 1 calendar.");
  ok(true, "Sync now works");
  await page.getByLabel("Platform").fill("Vrbo");
  await page.getByLabel("Calendar link (iCal)").fill("http://localhost:12111/feed/missing.ics");
  await page.getByRole("button", { name: "Add calendar" }).click();
  await page.getByRole("alert").filter({ hasText: "first import failed" }).waitFor();
  await page.getByText(/— failed: The calendar server answered with HTTP 404/).first().waitFor();
  ok(true, "a broken feed link shows its error");

  // --- calendar view -----------------------------------------------------------
  await page.goto(`${APP}/admin/properties/${propertyId}/calendar?month=2026-12`);
  await page.getByRole("heading", { name: /December 2026/ }).waitFor();
  const cell = (d) => page.getByRole("button", { name: new RegExp(`December ${d}, 2026:`) });
  ok(/imported block — Airbnb/.test(await cell(13).getAttribute("aria-label")), "imported Airbnb block appears on the calendar");
  await cell(20).click(); await cell(22).click();
  ok((await page.getByLabel("First night").inputValue()) === "2026-12-20" && (await page.getByLabel("Last night").inputValue()) === "2026-12-22", "clicking days fills the block form");
  await page.getByLabel(/Reason/).fill("Owner stay");
  await page.getByRole("button", { name: "Block dates" }).click();
  await page.getByRole("button", { name: /December 21, 2026: blocked by you — Owner stay/ }).waitFor();
  ok(/available/.test(await cell(23).getAttribute("aria-label")), "dates 20–22 blocked, the 23rd still free");
  const avail = await (await fetch(`${APP}/api/availability/${propertyId}`)).json();
  ok(avail.ranges.some((r) => r.start === "2026-12-20" && r.end === "2026-12-23"), "manual block reaches the public calendar", JSON.stringify(avail.ranges));
  if (shots) await page.screenshot({ path: `${shots}/admin_calendar.png`, fullPage: true });
  await cell(21).click();
  await page.getByRole("button", { name: "Unblock these dates" }).click();
  await page.getByRole("button", { name: /December 21, 2026: available/ }).waitFor();
  ok(true, "clicking a block and unblocking frees the dates");
  await page.getByRole("link", { name: "Next month" }).click();
  await page.getByRole("heading", { name: /January 2027/ }).waitFor();
  ok(true, "month navigation works");

  // public page reflects the admin's work
  const pub = await ctx.newPage();
  await pub.route("**openstreetmap**", (r) => r.abort());
  await pub.goto(`${APP}/properties/e2e-test-cottage`, { waitUntil: "domcontentloaded" });
  await pub.getByRole("heading", { name: "E2E Test Cottage" }).waitFor();
  ok(await pub.getByText("Hot tub").isVisible() && (await pub.locator('img[alt="Sunny kitchen with oak counters"]').count()) > 0, "new property is live on the website with its amenities and photo");
  await pub.close();

  // --- bookings ----------------------------------------------------------------
  await page.goto(`${APP}/admin/bookings`);
  await page.getByText("Sample Guest").first().waitFor();
  await page.getByLabel("Search").fill("nobody-here");
  await page.getByRole("button", { name: "Filter" }).click();
  await page.getByText("No bookings match these filters.").waitFor();
  await page.getByLabel("Search").fill("sample.guest");
  await page.getByLabel("Status").selectOption("confirmed");
  await page.getByRole("button", { name: "Filter" }).click();
  await page.getByText("Sample Guest").first().waitFor();
  ok(page.url().includes("status=confirmed"), "bookings can be searched and filtered by status");
  await page.locator("summary").first().click();
  await page.getByLabel("Private notes").first().fill("Arriving late");
  await page.getByRole("button", { name: "Save note" }).first().click();
  await status("Note saved.");
  ok(await page.getByText("sample.guest@example.com").first().isVisible() && await page.getByText("Accommodation").first().isVisible(), "booking details show guest contact and amounts; note saved");
  if (shots) await page.screenshot({ path: `${shots}/admin_bookings.png`, fullPage: true });

  // --- testimonials, guide, policies → public site -------------------------------
  await page.goto(`${APP}/admin/testimonials`);
  await page.locator("#t-name-new").fill("E2E Reviewer");
  await page.locator("#t-quote-new").fill("An automated but heartfelt review.");
  await page.locator("#t-order-new").fill("-5");
  await page.getByRole("button", { name: "Add testimonial" }).click();
  await status("Testimonial added.");
  ok((await (await fetch(`${APP}/`)).text()).includes("An automated but heartfelt review."), "new testimonial appears on the home page immediately");

  await page.goto(`${APP}/admin/guide`);
  await page.locator("#g-title-new").fill("E2E Coffee Roasters");
  await page.locator("#g-desc-new").fill("Best flat white in Testville.");
  await page.getByRole("button", { name: "Add entry" }).click();
  await status("Guide entry added.");
  ok((await (await fetch(`${APP}/guide`)).text()).includes("E2E Coffee Roasters"), "new guide entry appears on the Local guide page");

  await page.goto(`${APP}/admin/policies`);
  await page.locator("#content-cancellation_policy").fill("E2E policy: free cancellation up to 7 days before arrival.");
  await page.getByRole("button", { name: "Save cancellation policy" }).click();
  await status("Saved.");
  ok((await (await fetch(`${APP}/policies`)).text()).includes("E2E policy: free cancellation"), "edited cancellation policy appears on the Policies page");
  await page.locator("#content-cancellation_policy").fill("");
  await page.getByRole("button", { name: "Save cancellation policy" }).click();
  await status("Reset to the default text.");
  ok((await (await fetch(`${APP}/policies`)).text()).includes("Full refund for cancellations made at least 30 days"), "clearing the box restores the default from site.config.ts");

  // --- guests CSV ----------------------------------------------------------------
  await page.goto(`${APP}/admin/guests`);
  await page.getByText("sample.guest@example.com").waitFor();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Export all guests (CSV)" }).click()]);
  const csv = fs.readFileSync(await download.path(), "utf8");
  ok(/^﻿Name,Email,Phone,Marketing opt-in/.test(csv) && csv.includes("Sample Guest,sample.guest@example.com") && download.suggestedFilename().endsWith(".csv"), "guest list downloads as CSV", csv.slice(0, 200));

  // --- clean up + delete -----------------------------------------------------------
  await page.goto(`${APP}/admin/testimonials`);
  await page.getByRole("region", { name: "Testimonial from E2E Reviewer" }).getByRole("button", { name: "Delete" }).click();
  await page.getByRole("region", { name: "Testimonial from E2E Reviewer" }).waitFor({ state: "detached" });
  await page.goto(`${APP}/admin/guide`);
  await page.getByRole("region", { name: "E2E Coffee Roasters" }).getByRole("button", { name: "Delete" }).click();
  await page.getByRole("region", { name: "E2E Coffee Roasters" }).waitFor({ state: "detached" });
  await page.goto(`${APP}/admin/properties/${propertyId}`);
  await page.getByRole("button", { name: "Delete this property" }).click();
  await page.waitForURL(/\/admin\/properties\?deleted=1/, { waitUntil: "commit" });
  ok((await fetch(`${APP}/api/ical/${propertyId}.ics`)).status === 404, "property deleted (with its photos, prices and feeds)");

  // property with bookings cannot be deleted
  await page.goto(`${APP}/admin/properties`);
  await page.goto(await page.getByRole("link", { name: "Edit details" }).first().evaluate((a) => a.href));
  await page.getByRole("button", { name: "Delete this property" }).waitFor();
  await page.getByRole("button", { name: "Delete this property" }).click();
  await page.getByRole("alert").filter({ hasText: "has bookings" }).waitFor();
  ok(true, "a property with bookings cannot be deleted (clear message)");

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/admin\/login/, { waitUntil: "commit" });
  await page.goto(`${APP}/admin/bookings`);
  ok(page.url().endsWith("/admin/login"), "after signing out the dashboard is locked again");

  ok(pageErrors.length === 0, "no JavaScript errors in the dashboard", pageErrors.join(" | "));
  await browser.close();
  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("ABORTED:", e.message.split("\n").slice(0, 6).join("\n")); process.exit(1); });
