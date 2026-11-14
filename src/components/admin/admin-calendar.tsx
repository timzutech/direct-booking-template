"use client";

import { useState } from "react";
import { blockDates, unblockDates } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { formatDate } from "@/lib/format";

export type CalendarDay = {
  date: string;
  kind: "free" | "booking" | "pending" | "ical" | "manual";
  label: string | null; // who/what occupies the night
  blockId: string | null; // for manual blocks
  past: boolean;
};

export type ManualBlock = { id: string; first: string; last: string; summary: string | null };

const kindStyles: Record<CalendarDay["kind"], string> = {
  free: "bg-surface text-ink hover:bg-primary/10",
  booking: "bg-primary text-primary-fg",
  pending: "bg-primary/35 text-ink",
  ical: "bg-amber-200 text-amber-950",
  manual: "bg-stone-300 text-stone-900 hover:bg-stone-400",
};

const kindNames: Record<CalendarDay["kind"], string> = {
  free: "available",
  booking: "direct booking",
  pending: "awaiting payment",
  ical: "imported block",
  manual: "blocked by you",
};

export function AdminCalendar({
  propertyId, days, leadingBlanks, weekdays, manualBlocks,
}: { propertyId: string; days: CalendarDay[]; leadingBlanks: number; weekdays: string[]; manualBlocks: ManualBlock[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  const click = (day: CalendarDay) => {
    if (day.kind === "manual") {
      setSelectedBlock(day.blockId);
      return;
    }
    if (day.kind !== "free") return;
    setSelectedBlock(null);
    if (!from || to || day.date < from) {
      setFrom(day.date);
      setTo("");
    } else {
      setTo(day.date);
    }
  };

  const inSelection = (date: string) => from !== "" && date >= from && date <= (to || from);
  const block = manualBlocks.find((b) => b.id === selectedBlock) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div>
        <div className="grid grid-cols-7 gap-1 text-center" role="group" aria-label="Calendar">
          {weekdays.map((w) => <span key={w} aria-hidden="true" className="pb-1 text-xs font-medium uppercase tracking-wide text-ink-soft">{w}</span>)}
          {Array.from({ length: leadingBlanks }, (_, i) => <span key={`b${i}`} />)}
          {days.map((day) => {
            const interactive = day.kind === "free" || day.kind === "manual";
            return (
              <button
                key={day.date}
                type="button"
                aria-disabled={!interactive}
                aria-pressed={inSelection(day.date) || (day.blockId !== null && day.blockId === selectedBlock)}
                aria-label={`${formatDate(day.date, "long")}: ${kindNames[day.kind]}${day.label ? ` — ${day.label}` : ""}`}
                title={day.label ?? undefined}
                onClick={() => click(day)}
                className={`flex min-h-16 flex-col items-start rounded-lg border p-1.5 text-left text-xs transition-colors ${kindStyles[day.kind]} ${
                  inSelection(day.date) || (day.blockId !== null && day.blockId === selectedBlock) ? "border-ink ring-2 ring-ink" : "border-line"
                } ${day.past ? "opacity-50" : ""} ${interactive ? "cursor-pointer" : "cursor-default"}`}
              >
                <span className="text-sm font-semibold tabular-nums">{Number(day.date.slice(8))}</span>
                {day.label && <span className="mt-0.5 line-clamp-2 w-full break-words leading-tight">{day.label}</span>}
              </button>
            );
          })}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft" aria-label="Legend">
          {(["booking", "pending", "ical", "manual", "free"] as const).map((kind) => (
            <li key={kind} className="flex items-center gap-2">
              <span className={`h-4 w-4 rounded border border-line ${kindStyles[kind].split(" ")[0]}`} aria-hidden="true" />
              <span className="capitalize">{kindNames[kind]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-5">
        {block ? (
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="text-xl font-semibold text-ink">Blocked by you</h3>
            <p className="mt-1 text-sm text-ink-soft">
              {formatDate(block.first)}{block.last !== block.first && ` – ${formatDate(block.last)}`}
              {block.summary && ` · ${block.summary}`}
            </p>
            <ActionForm action={unblockDates} className="mt-3">
              <input type="hidden" name="id" value={block.id} />
              <input type="hidden" name="property_id" value={propertyId} />
              <div className="flex gap-3">
                <SubmitButton pendingText="Unblocking…">Unblock these dates</SubmitButton>
                <button type="button" onClick={() => setSelectedBlock(null)} className="text-sm text-ink-soft underline underline-offset-4">Cancel</button>
              </div>
            </ActionForm>
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="text-xl font-semibold text-ink">Block dates</h3>
            <p className="mt-1 text-sm text-ink-soft">Click the first and last night on the calendar, or type the dates. Click a grey block to unblock it.</p>
            <ActionForm action={blockDates} className="mt-3 space-y-3">
              <input type="hidden" name="property_id" value={propertyId} />
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="block-from" className="label">First night</label><input id="block-from" name="from" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} className="field" /></div>
                <div><label htmlFor="block-to" className="label">Last night</label><input id="block-to" name="to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="field" /></div>
              </div>
              <div><label htmlFor="block-summary" className="label">Reason <span className="font-normal text-ink-soft">(private)</span></label><input id="block-summary" name="summary" maxLength={120} placeholder="Owner stay, maintenance…" className="field" /></div>
              <SubmitButton pendingText="Blocking…">Block dates</SubmitButton>
            </ActionForm>
          </div>
        )}
      </div>
    </div>
  );
}
