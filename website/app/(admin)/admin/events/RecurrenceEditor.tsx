"use client";

import { useState } from "react";
import {
  WEEKDAYS,
  type Recurrence,
  type RecurrenceEnd,
  type Weekday,
} from "@/db/schema";
import { summarizeRecurrence } from "@/lib/recurrence";

const WEEKDAY_LABEL: Record<Weekday, string> = {
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
  SU: "Sun",
};

const NTH_LABEL: Record<1 | 2 | 3 | 4 | 5 | "last", string> = {
  1: "First",
  2: "Second",
  3: "Third",
  4: "Fourth",
  5: "Fifth",
  last: "Last",
};

export function RecurrenceEditor({
  value,
  onChange,
  exceptionDates,
  onExceptionsChange,
  baseStart,
}: {
  value: Recurrence | null;
  onChange: (next: Recurrence | null) => void;
  exceptionDates: string[];
  onExceptionsChange: (next: string[]) => void;
  /** ISO datetime-local value of the event's start, used to seed exception times. */
  baseStart: string;
}) {
  const [newException, setNewException] = useState("");

  const enable = () =>
    onChange({
      freq: "weekly",
      interval: 1,
      byday: ["MO"],
      ends: { kind: "never" },
    });
  const disable = () => {
    onChange(null);
    onExceptionsChange([]);
  };

  const switchFreq = (freq: "weekly" | "monthly_nth") => {
    if (!value) return;
    if (freq === value.freq) return;
    if (freq === "weekly") {
      onChange({
        freq: "weekly",
        interval: 1,
        byday: ["MO"],
        ends: value.ends,
      });
    } else {
      onChange({
        freq: "monthly_nth",
        interval: 1,
        nth: 1,
        weekday: "MO",
        ends: value.ends,
      });
    }
  };

  const setEnds = (ends: RecurrenceEnd) => {
    if (!value) return;
    onChange({ ...value, ends } as Recurrence);
  };

  const addException = () => {
    if (!newException) return;
    // Always store as a full ISO with the same clock time as the base
    // start. Editor surfaces the date; we re-attach the time so the
    // expansion's exact-equality check works.
    let iso: string;
    try {
      // newException is "YYYY-MM-DD" (date input). Use the base event's
      // time-of-day; if absent, use midnight UTC.
      const [y, m, d] = newException.split("-").map(Number);
      const base = baseStart ? new Date(baseStart) : null;
      const dt = new Date(
        Date.UTC(
          y ?? 1970,
          (m ?? 1) - 1,
          d ?? 1,
          base ? base.getHours() : 0,
          base ? base.getMinutes() : 0,
          0,
          0,
        ),
      );
      iso = dt.toISOString();
    } catch {
      return;
    }
    if (exceptionDates.includes(iso)) return;
    onExceptionsChange([...exceptionDates, iso].sort());
    setNewException("");
  };

  const removeException = (iso: string) =>
    onExceptionsChange(exceptionDates.filter((e) => e !== iso));

  if (!value) {
    return (
      <div className="rounded-lg border border-dashed border-rule bg-cream/40 p-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h3 className="font-serif text-base font-bold text-navy">Repeats</h3>
            <p className="mt-1 text-xs text-ink-3">
              One-off event. Toggle on for weekly meetings, monthly programs, etc.
            </p>
          </div>
          <button
            type="button"
            onClick={enable}
            className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy"
          >
            + Make recurring
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-rule bg-cream/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-serif text-base font-bold text-navy">Repeats</h3>
          <p className="mt-1 text-xs text-ink-3">{summarizeRecurrence(value)}</p>
        </div>
        <button
          type="button"
          onClick={disable}
          className="text-xs font-semibold text-rust-dark hover:text-rust"
        >
          Make one-off
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Frequency
          </label>
          <select
            value={value.freq}
            onChange={(e) => switchFreq(e.target.value as "weekly" | "monthly_nth")}
            className="form-input"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly_nth">Nth weekday of the month</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Repeat every
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={value.freq === "weekly" ? 52 : 24}
              value={value.interval}
              onChange={(e) =>
                onChange({
                  ...value,
                  interval: Math.max(1, Number(e.target.value) || 1),
                } as Recurrence)
              }
              className="form-input w-24"
            />
            <span className="text-sm text-ink-2">
              {value.freq === "weekly" ? "week(s)" : "month(s)"}
            </span>
          </div>
        </div>
      </div>

      {value.freq === "weekly" ? (
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            On these days
          </label>
          <div className="flex flex-wrap gap-1">
            {WEEKDAYS.map((d) => {
              const active = value.byday.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? value.byday.filter((x) => x !== d)
                      : [...value.byday, d];
                    onChange({
                      ...value,
                      byday: next.length === 0 ? value.byday : next,
                    });
                  }}
                  className={
                    "rounded-pill px-3 py-1 text-xs font-semibold transition-colors " +
                    (active
                      ? "bg-navy text-white"
                      : "border border-rule bg-white text-ink-2 hover:border-navy")
                  }
                >
                  {WEEKDAY_LABEL[d]}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              Which week
            </label>
            <select
              value={String(value.nth)}
              onChange={(e) => {
                const v = e.target.value;
                const nth: 1 | 2 | 3 | 4 | 5 | "last" =
                  v === "last" ? "last" : (Number(v) as 1 | 2 | 3 | 4 | 5);
                onChange({ ...value, nth });
              }}
              className="form-input"
            >
              {(["1", "2", "3", "4", "5", "last"] as const).map((k) => (
                <option key={k} value={k}>
                  {NTH_LABEL[k === "last" ? "last" : (Number(k) as 1 | 2 | 3 | 4 | 5)]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              Weekday
            </label>
            <select
              value={value.weekday}
              onChange={(e) =>
                onChange({ ...value, weekday: e.target.value as Weekday })
              }
              className="form-input"
            >
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {WEEKDAY_LABEL[d]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
          Ends
        </label>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="ends"
              checked={value.ends.kind === "never"}
              onChange={() => setEnds({ kind: "never" })}
            />
            Never
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="ends"
              checked={value.ends.kind === "count"}
              onChange={() => setEnds({ kind: "count", count: 12 })}
            />
            After
            <input
              type="number"
              min={1}
              max={520}
              value={value.ends.kind === "count" ? value.ends.count : 12}
              disabled={value.ends.kind !== "count"}
              onChange={(e) =>
                setEnds({ kind: "count", count: Math.max(1, Number(e.target.value) || 1) })
              }
              className="form-input w-20"
            />
            occurrences
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="ends"
              checked={value.ends.kind === "until"}
              onChange={() =>
                setEnds({ kind: "until", until: new Date().toISOString().slice(0, 10) })
              }
            />
            On
            <input
              type="date"
              value={value.ends.kind === "until" ? value.ends.until : ""}
              disabled={value.ends.kind !== "until"}
              onChange={(e) => setEnds({ kind: "until", until: e.target.value })}
              className="form-input w-40"
            />
          </label>
        </div>
      </div>

      <div className="border-t border-dashed border-rule pt-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
          Exceptions
        </h4>
        <p className="mt-1 text-xs text-ink-3">
          Skip specific dates (cancellations, holiday weeks). Add as many as needed.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={newException}
            onChange={(e) => setNewException(e.target.value)}
            className="form-input w-44"
          />
          <button
            type="button"
            onClick={addException}
            disabled={!newException}
            className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-navy hover:border-navy disabled:opacity-50"
          >
            + Skip this date
          </button>
        </div>
        {exceptionDates.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {exceptionDates.map((iso) => {
              const d = new Date(iso);
              return (
                <li
                  key={iso}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-rule bg-white px-2 py-0.5 text-xs"
                >
                  {d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  <button
                    type="button"
                    onClick={() => removeException(iso)}
                    className="text-rust-dark hover:text-rust"
                    aria-label="Remove exception"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
