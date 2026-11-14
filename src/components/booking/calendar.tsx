"use client";

import { useMemo, useRef } from "react";
import { siteConfig } from "../../../site.config";
import { Icon } from "@/components/icons";
import { isNightUnavailable } from "@/lib/availability";
import { addDays, addMonths, dayOfWeek, daysInMonth, startOfMonth, toUtc } from "@/lib/dates";
import type { DateRange } from "@/lib/types";

type Props = {
  month: string; // first day of the visible month
  onMonthChange: (month: string) => void;
  unavailable: DateRange[];
  earliestCheckIn: string;
  latestCheckOut: string;
  checkIn: string | null;
  checkOut: string | null;
  onSelect: (date: string) => void;
};

const weekdayFmt = new Intl.DateTimeFormat(siteConfig.locale, { weekday: "short", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat(siteConfig.locale, { month: "long", year: "numeric", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat(siteConfig.locale, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/** What a click on `date` would mean, given the current selection. */
export function dayState(
  date: string,
  p: Pick<Props, "unavailable" | "earliestCheckIn" | "latestCheckOut" | "checkIn" | "checkOut">,
): "checkin" | "checkout" | "disabled" {
  const choosingCheckOut = p.checkIn !== null && p.checkOut === null;
  if (choosingCheckOut && date > p.checkIn! && date <= p.latestCheckOut) {
    // Valid checkout if every night from check-in up to (not including) this day is free.
    let clear = true;
    for (let d = p.checkIn!; d < date && clear; d = addDays(d, 1)) {
      if (isNightUnavailable(p.unavailable, d)) clear = false;
    }
    if (clear) return "checkout";
  }
  // Otherwise the click starts a new stay: the night itself must be bookable.
  if (date < p.earliestCheckIn || date >= p.latestCheckOut) return "disabled";
  if (isNightUnavailable(p.unavailable, date)) return "disabled";
  return "checkin";
}

export function Calendar(props: Props) {
  const { month, onMonthChange, checkIn, checkOut, onSelect } = props;
  const gridRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    const first = startOfMonth(month);
    return Array.from({ length: daysInMonth(first) }, (_, i) => addDays(first, i));
  }, [month]);
  const leadingBlanks = dayOfWeek(days[0]);
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => weekdayFmt.format(new Date(Date.UTC(2023, 0, 1 + i)))), []);

  const canGoBack = month > startOfMonth(props.earliestCheckIn);
  const canGoForward = addMonths(month, 1) <= props.latestCheckOut;

  const focusDate = (date: string) =>
    gridRef.current?.querySelector<HTMLButtonElement>(`button[data-date="${date}"]`)?.focus();

  const onKeyDown = (e: React.KeyboardEvent, date: string) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const target = addDays(date, delta);
    if (startOfMonth(target) !== month) {
      if ((delta < 0 && !canGoBack) || (delta > 0 && !canGoForward)) return;
      onMonthChange(startOfMonth(target));
      requestAnimationFrame(() => focusDate(target));
    } else {
      focusDate(target);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onMonthChange(addMonths(month, -1))} disabled={!canGoBack} aria-label="Previous month"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-muted disabled:opacity-30">
          <Icon name="chevron-left" />
        </button>
        <p aria-live="polite" className="font-heading text-xl font-semibold text-ink">{monthFmt.format(toUtc(month))}</p>
        <button type="button" onClick={() => onMonthChange(addMonths(month, 1))} disabled={!canGoForward} aria-label="Next month"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-muted disabled:opacity-30">
          <Icon name="chevron-right" />
        </button>
      </div>

      <div ref={gridRef} role="group" aria-label={`Choose dates, ${monthFmt.format(toUtc(month))}`} className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {weekdays.map((w) => (
          <span key={w} aria-hidden="true" className="pb-1 text-xs font-medium uppercase tracking-wide text-ink-soft">{w}</span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => <span key={`blank-${i}`} />)}
        {days.map((date) => {
          const state = dayState(date, props);
          const isStart = date === checkIn;
          const isEnd = date === checkOut;
          const inRange = checkIn !== null && checkOut !== null && date > checkIn && date < checkOut;
          const label =
            `${dayFmt.format(toUtc(date))}` +
            (isStart ? ", check-in" : isEnd ? ", check-out" : state === "disabled" ? ", unavailable" : state === "checkout" ? ", choose as check-out" : ", available");
          return (
            <div key={date} className={`${inRange ? "bg-primary/10" : ""} ${isStart && checkOut ? "rounded-l-full bg-primary/10" : ""} ${isEnd ? "rounded-r-full bg-primary/10" : ""}`}>
              <button
                type="button"
                data-date={date}
                aria-disabled={state === "disabled"}
                aria-label={label}
                aria-pressed={isStart || isEnd}
                onClick={() => state !== "disabled" && onSelect(date)}
                onKeyDown={(e) => onKeyDown(e, date)}
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm tabular-nums transition-colors ${
                  isStart || isEnd
                    ? "bg-primary font-semibold text-primary-fg"
                    : state === "disabled"
                      ? "cursor-not-allowed text-ink-soft/45 line-through"
                      : "text-ink hover:bg-primary/15"
                }`}
              >
                {Number(date.slice(8))}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
