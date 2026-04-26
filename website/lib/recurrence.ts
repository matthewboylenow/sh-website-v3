import {
  WEEKDAYS,
  type Recurrence,
  type RecurrenceEnd,
  type Weekday,
} from "@/db/schema";

/**
 * Recurrence expansion. Given a base event and a date window, yield
 * concrete instance start/end timestamps. Pure functions — no DB access.
 *
 * v1 supports two rule shapes:
 *   - weekly with interval + multi-weekday picker
 *   - "nth weekday of the month" with interval (e.g. 2nd Tuesday every month)
 *
 * Exception dates are matched on the timestamp's ISO string. Editor
 * stores them in the same shape we generate, so equality works.
 */

/** Default expansion horizon for "never"-ending rules. */
export const DEFAULT_HORIZON_MONTHS = 6;

/** Hard cap so a misconfigured rule can't loop forever. */
const SAFETY_MAX = 2000;

const JS_DAY_TO_CODE: Weekday[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function weekdayCode(d: Date): Weekday {
  return JS_DAY_TO_CODE[d.getUTCDay()] ?? "MO";
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + n);
  return next;
}

function addMonths(d: Date, n: number): Date {
  const next = new Date(d.getTime());
  // Use month math that doesn't overshoot (e.g. Jan 31 + 1 month → Feb 28).
  const target = next.getUTCMonth() + n;
  next.setUTCDate(1);
  next.setUTCMonth(target);
  return next;
}

function startOfWeek(d: Date): Date {
  // Monday-anchored week. JS getDay: 0=Sun..6=Sat. Convert to 0=Mon..6=Sun.
  const day = (d.getUTCDay() + 6) % 7;
  return addDays(d, -day);
}

/** Build a date in UTC at the same H:M:S as `template`. */
function withClockOf(date: Date, template: Date): Date {
  const next = new Date(date.getTime());
  next.setUTCHours(
    template.getUTCHours(),
    template.getUTCMinutes(),
    template.getUTCSeconds(),
    template.getUTCMilliseconds(),
  );
  return next;
}

/** True when `current` is within the recurrence's end condition. */
function notPastEnd(
  current: Date,
  emittedCount: number,
  ends: RecurrenceEnd,
): boolean {
  if (ends.kind === "never") return true;
  if (ends.kind === "count") return emittedCount < ends.count;
  // until: inclusive of the day specified
  const u = new Date(`${ends.until}T23:59:59.999Z`);
  return current.getTime() <= u.getTime();
}

/** nth (or last) weekday of the given month-year, returned as a UTC Date. */
function nthWeekdayOfMonth(
  year: number,
  month: number /* 0-indexed */,
  nth: 1 | 2 | 3 | 4 | 5 | "last",
  weekday: Weekday,
): Date | null {
  const targetIdx = WEEKDAYS.indexOf(weekday); // 0=MO..6=SU
  if (targetIdx === -1) return null;
  // Iterate every day of the month and pick.
  const occurrences: Date[] = [];
  const probe = new Date(Date.UTC(year, month, 1));
  while (probe.getUTCMonth() === month) {
    const code = weekdayCode(probe);
    if (code === weekday) occurrences.push(new Date(probe.getTime()));
    probe.setUTCDate(probe.getUTCDate() + 1);
  }
  if (occurrences.length === 0) return null;
  if (nth === "last") return occurrences[occurrences.length - 1] ?? null;
  return occurrences[nth - 1] ?? null;
}

export type EventInstance = {
  startsAt: Date;
  endsAt: Date;
  /** True when this is the original (one-off) event vs. an expanded recurrence. */
  isOriginal: boolean;
};

/**
 * Yield concrete instances of a recurring event between `fromDate` and
 * `toDate`. For one-off events, returns a single instance if the base
 * dates fall in window.
 */
export function expandEvent(
  base: { startsAt: Date | string; endsAt: Date | string },
  recurrence: Recurrence | null | undefined,
  exceptionDates: string[],
  fromDate: Date,
  toDate: Date,
): EventInstance[] {
  const baseStart = base.startsAt instanceof Date ? base.startsAt : new Date(base.startsAt);
  const baseEnd = base.endsAt instanceof Date ? base.endsAt : new Date(base.endsAt);
  const durationMs = baseEnd.getTime() - baseStart.getTime();

  if (!recurrence) {
    if (baseEnd < fromDate || baseStart > toDate) return [];
    return [{ startsAt: baseStart, endsAt: baseEnd, isOriginal: true }];
  }

  const exceptions = new Set(exceptionDates.map((s) => new Date(s).toISOString()));
  const out: EventInstance[] = [];
  let emitted = 0;

  if (recurrence.freq === "weekly") {
    const byday = recurrence.byday;
    if (byday.length === 0) return [];
    // Walk one full week at a time, scaled by interval.
    let cursor = startOfWeek(baseStart);
    let safety = 0;
    while (
      safety++ < SAFETY_MAX &&
      cursor <= toDate &&
      notPastEnd(cursor, emitted, recurrence.ends)
    ) {
      // For each weekday in this week (Mon..Sun)
      for (let i = 0; i < 7; i++) {
        if (!notPastEnd(cursor, emitted, recurrence.ends)) break;
        const day = addDays(cursor, i);
        const code = weekdayCode(day);
        if (!byday.includes(code)) continue;
        const startsAt = withClockOf(day, baseStart);
        if (startsAt < baseStart) continue; // never emit before original start
        if (startsAt > toDate) break;
        if (startsAt >= fromDate) {
          if (!exceptions.has(startsAt.toISOString())) {
            out.push({
              startsAt,
              endsAt: new Date(startsAt.getTime() + durationMs),
              isOriginal: startsAt.getTime() === baseStart.getTime(),
            });
          }
        }
        emitted++;
        if (recurrence.ends.kind === "count" && emitted >= recurrence.ends.count) break;
      }
      cursor = addDays(cursor, 7 * Math.max(1, recurrence.interval));
    }
    return out;
  }

  // monthly_nth
  let monthCursor = new Date(
    Date.UTC(baseStart.getUTCFullYear(), baseStart.getUTCMonth(), 1),
  );
  let safety = 0;
  while (
    safety++ < SAFETY_MAX &&
    monthCursor <= toDate &&
    notPastEnd(monthCursor, emitted, recurrence.ends)
  ) {
    const day = nthWeekdayOfMonth(
      monthCursor.getUTCFullYear(),
      monthCursor.getUTCMonth(),
      recurrence.nth,
      recurrence.weekday,
    );
    if (day) {
      const startsAt = withClockOf(day, baseStart);
      if (startsAt >= baseStart && startsAt <= toDate) {
        if (startsAt >= fromDate && !exceptions.has(startsAt.toISOString())) {
          out.push({
            startsAt,
            endsAt: new Date(startsAt.getTime() + durationMs),
            isOriginal: startsAt.getTime() === baseStart.getTime(),
          });
        }
        emitted++;
        if (recurrence.ends.kind === "count" && emitted >= recurrence.ends.count) break;
      }
    }
    monthCursor = addMonths(monthCursor, Math.max(1, recurrence.interval));
  }
  return out;
}

/** Expand a list of events into concrete instances within a window,
 *  preserving each event's metadata and tagging the occurrence dates. */
export function expandEvents<
  T extends {
    startsAt: Date | string;
    endsAt: Date | string;
    recurrence?: Recurrence | null;
    exceptionDates?: string[] | null;
  },
>(
  list: T[],
  fromDate: Date,
  toDate: Date,
): Array<T & { occurrenceStartsAt: Date; occurrenceEndsAt: Date }> {
  const out: Array<T & { occurrenceStartsAt: Date; occurrenceEndsAt: Date }> = [];
  for (const e of list) {
    const instances = expandEvent(
      e,
      e.recurrence ?? null,
      e.exceptionDates ?? [],
      fromDate,
      toDate,
    );
    for (const inst of instances) {
      out.push({
        ...e,
        occurrenceStartsAt: inst.startsAt,
        occurrenceEndsAt: inst.endsAt,
      });
    }
  }
  out.sort((a, b) => a.occurrenceStartsAt.getTime() - b.occurrenceStartsAt.getTime());
  return out;
}

/** Human-readable summary of a recurrence rule, for admin previews + public detail. */
export function summarizeRecurrence(r: Recurrence | null | undefined): string {
  if (!r) return "Does not repeat";
  const interval = Math.max(1, r.interval);
  if (r.freq === "weekly") {
    const days = r.byday.map(weekdayName).join(", ");
    const everyN =
      interval === 1 ? "Every week" : interval === 2 ? "Every other week" : `Every ${interval} weeks`;
    return `${everyN} on ${days}${endSuffix(r.ends)}`;
  }
  // monthly_nth
  const ord = ordinal(r.nth);
  const everyN =
    interval === 1 ? "Every month" : interval === 2 ? "Every other month" : `Every ${interval} months`;
  return `${everyN} on the ${ord} ${weekdayName(r.weekday)}${endSuffix(r.ends)}`;
}

function ordinal(nth: 1 | 2 | 3 | 4 | 5 | "last"): string {
  if (nth === "last") return "last";
  return ["first", "second", "third", "fourth", "fifth"][nth - 1] ?? `${nth}th`;
}

function weekdayName(w: Weekday): string {
  return {
    MO: "Monday",
    TU: "Tuesday",
    WE: "Wednesday",
    TH: "Thursday",
    FR: "Friday",
    SA: "Saturday",
    SU: "Sunday",
  }[w];
}

function endSuffix(ends: RecurrenceEnd): string {
  if (ends.kind === "never") return "";
  if (ends.kind === "count") return ` · ${ends.count} occurrence${ends.count === 1 ? "" : "s"}`;
  return ` · until ${ends.until}`;
}
