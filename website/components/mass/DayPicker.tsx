"use client";

import { useEffect, useRef, useState } from "react";

export type MassEntry = {
  id: string;
  time: string; // "HH:MM:SS"
  label: string | null;
  kind: "sunday" | "vigil" | "daily" | "holy_day";
  liveStreamUrl: string | null;
  presider: { name: string | null; role: string | null } | null;
};

export type WeekDay = {
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** Full label — "Monday, April 27" */
  title: string;
  /** "Mon" or "Mon · Today" */
  shortLabel: string;
  /** "27" */
  dayNum: string;
  isToday: boolean;
  times: MassEntry[];
};

/**
 * Mass day picker — 7 rounded tiles, arrow-key nav, defaults to today.
 * Contract from design-ref/pages/handoff.html §07.
 */
export function DayPicker({ week }: { week: WeekDay[] }) {
  const todayIdx = Math.max(
    0,
    week.findIndex((w) => w.isToday),
  );
  const [selected, setSelected] = useState(todayIdx);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const btn = listRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    )[selected];
    // Keep selected tile scrolled into view on narrow viewports.
    btn?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [selected]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSelected((i) => (i - 1 + week.length) % week.length);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSelected((i) => (i + 1) % week.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelected(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelected(week.length - 1);
    }
  };

  const day = week[selected];

  return (
    <div>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Choose a day"
        onKeyDown={onKey}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
      >
        {week.map((w, i) => {
          const active = i === selected;
          return (
            <button
              key={w.date}
              role="tab"
              id={`mass-tab-${w.date}`}
              type="button"
              aria-selected={active}
              aria-controls={`mass-panel-${w.date}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(i)}
              className={`flex min-w-[88px] flex-col items-center gap-1 rounded-lg border px-4 py-3 text-center transition-colors ${
                active
                  ? "border-navy bg-navy text-white"
                  : "border-rule bg-white text-ink-2 hover:border-navy"
              }`}
            >
              <span className={`text-xs font-semibold uppercase tracking-[0.1em] ${active ? "text-gold" : "text-ink-3"}`}>
                {w.shortLabel}
              </span>
              <span className="font-serif text-2xl font-bold leading-none">
                {w.dayNum}
              </span>
              {w.times.length > 0 && (
                <span className={`block h-1.5 w-1.5 rounded-full ${active ? "bg-gold" : "bg-rust"}`} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {day && (
        <div
          id={`mass-panel-${day.date}`}
          role="tabpanel"
          aria-labelledby={`mass-tab-${day.date}`}
          className="mt-8"
        >
          <h3 className="font-serif text-2xl font-bold text-navy">
            {day.title}
          </h3>
          {day.times.length === 0 ? (
            <p className="mt-4 text-sm text-ink-3">
              No Masses scheduled.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {day.times.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-baseline justify-between gap-4 rounded-md border border-rule bg-white px-5 py-4"
                >
                  <div>
                    <div className="font-serif text-xl font-bold text-navy">
                      {formatTime(m.time)}
                    </div>
                    <div className="mt-1 text-sm text-ink-2">
                      {prettyKind(m.kind)}
                    </div>
                  </div>
                  {m.liveStreamUrl && (
                    <span className="rounded-pill bg-rust-pale px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-rust-dark">
                      Livestream
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0
    ? `${h12}:00 ${period}`
    : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function prettyKind(k: MassEntry["kind"]) {
  return k === "vigil"
    ? "Saturday Vigil"
    : k === "sunday"
      ? "Sunday"
      : k === "daily"
        ? "Daily Mass"
        : "Holy Day";
}
