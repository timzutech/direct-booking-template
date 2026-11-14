import { describe, expect, it } from "vitest";
import { buildIcalFeed } from "@/lib/ical/export";
import { parseIcalFeed } from "@/lib/ical/parse";

const tz = { timeZone: "America/New_York" };
const cal = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR\r\n`;
const ev = (lines: string[]) => ["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n");

describe("parseIcalFeed", () => {
  it("reads Airbnb-style all-day events with an exclusive end date", () => {
    const events = parseIcalFeed(cal(ev(["DTSTART;VALUE=DATE:20270310", "DTEND;VALUE=DATE:20270315", "UID:abc@airbnb.com", "SUMMARY:Reserved"])), tz);
    expect(events).toEqual([{ start: "2027-03-10", end: "2027-03-15", uid: "abc@airbnb.com", summary: "Reserved" }]);
  });

  it("reads timed events in their own timezone (check-in 4pm → check-out 10am)", () => {
    const events = parseIcalFeed(cal(ev(["DTSTART;TZID=America/New_York:20270401T160000", "DTEND;TZID=America/New_York:20270405T100000", "UID:t1"])), tz);
    expect(events[0]).toMatchObject({ start: "2027-04-01", end: "2027-04-05" });
  });

  it("converts UTC timed events to the site timezone", () => {
    // 02:00Z on 2 May is still 1 May (10pm) in New York
    const events = parseIcalFeed(cal(ev(["DTSTART:20270502T020000Z", "DTEND:20270504T140000Z", "UID:u1"])), tz);
    expect(events[0]).toMatchObject({ start: "2027-05-01", end: "2027-05-04" });
  });

  it("gives events without an end (or a zero-length end) one night", () => {
    const events = parseIcalFeed(cal([ev(["DTSTART;VALUE=DATE:20270601", "UID:n1"]), ev(["DTSTART;VALUE=DATE:20270610", "DTEND;VALUE=DATE:20270610", "UID:n2"])].join("\r\n")), tz);
    expect(events.map((e) => [e.start, e.end])).toEqual([["2027-06-01", "2027-06-02"], ["2027-06-10", "2027-06-11"]]);
  });

  it("skips cancelled events, past events and our own exported events", () => {
    const text = cal([
      ev(["DTSTART;VALUE=DATE:20270701", "DTEND;VALUE=DATE:20270705", "UID:keep"]),
      ev(["DTSTART;VALUE=DATE:20270710", "DTEND;VALUE=DATE:20270715", "UID:gone", "STATUS:CANCELLED"]),
      ev(["DTSTART;VALUE=DATE:20200101", "DTEND;VALUE=DATE:20200105", "UID:old"]),
      ev(["DTSTART;VALUE=DATE:20270801", "DTEND;VALUE=DATE:20270805", "UID:booking-1@direct-booking"]),
    ].join("\r\n"));
    expect(parseIcalFeed(text, { ...tz, dropBefore: "2027-01-01" }).map((e) => e.uid)).toEqual(["keep"]);
  });

  it("returns an empty list for a valid empty calendar", () => {
    expect(parseIcalFeed("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR", tz)).toEqual([]);
  });

  it("throws on something that is not a calendar (e.g. an HTML error page)", () => {
    expect(() => parseIcalFeed("<html><body>Service unavailable</body></html>", tz)).toThrow(/not an iCal/);
  });
});

describe("buildIcalFeed", () => {
  const feed = buildIcalFeed("Lake Cabin, north; side", [
    { id: "booking-1", start: "2027-03-10", end: "2027-03-15", summary: "Reserved" },
    { id: "block-2", start: "2027-04-01", end: "2027-04-02", summary: "Not available" },
  ], new Date("2026-01-02T03:04:05Z"));

  it("produces a valid calendar with CRLF line endings and all-day events", () => {
    expect(feed.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(feed.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(feed).toContain("DTSTART;VALUE=DATE:20270310\r\nDTEND;VALUE=DATE:20270315");
    expect(feed).toContain("DTSTAMP:20260102T030405Z");
    expect(feed).toContain("X-WR-CALNAME:Lake Cabin\\, north\; side");
    expect(feed.split("\r\n").every((line) => line.length <= 75)).toBe(true);
  });

  it("round-trips through the importer, except that our own UIDs are ignored on import", () => {
    expect(parseIcalFeed(feed, tz)).toEqual([]);
    const foreign = feed.replaceAll("@direct-booking", "@elsewhere");
    expect(parseIcalFeed(foreign, tz).map((e) => [e.start, e.end])).toEqual([["2027-03-10", "2027-03-15"], ["2027-04-01", "2027-04-02"]]);
  });
});
