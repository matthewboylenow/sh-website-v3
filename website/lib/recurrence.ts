import {
  WEEKDAYS,
  type Recurrence,
  type RecurrenceEnd,
  type Weekday,
} from "@/db/schema";
import {
  fromParishWallClock,
  parishDateString,
  toParishWallClock,
  type WallClock,
} from "@/lib/timezone";

/**
 * Recurrence expansion. Given a base event and a date window, yield
 * concrete instance start/end timestamps. Pure functions — no DB access.
 *
 * **Everything here works on the parish's own clock, not UTC.** A 7pm Mass
 * is at 7pm all year. The previous version copied the base event's UTC time
 * onto every generated day, so an event created in August published as 6pm
 * from November to March — every recurring event on the site slid by an hour
 * for half the year.
 *
 * v1 supports two rule shapes:
 *   - weekly with interval + multi-weekday picker
 *   - "nth weekday of the month" with interval (e.g. 2nd Tuesday every month)
 */

/** Default expansion horizon for "never"-ending rules. */
export const DEFAULT_HORIZON_MONTHS = 6;

/** Hard cap so a misconfigured rule can't loop forever. */
const SAFETY_MAX = 2000;

const JS_DAY_TO_CODE: Weekday[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/* ------------------------------------------------------------------ */
/* Calendar arithmetic, on plain YYYY-MM-DD strings                    */
/*                                                                      */
/* Deliberately not Date maths. These are calendar days, and doing the  */
/* arithmetic on instants is what let the timezone in.                  */
/* ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

function dateToUtcNoon(date: string): number {
  // Noon, so adding days can never cross a day boundary by accident.
  return Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    12,
  );
}

function utcNoonToDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function addDays(date: string, n: number): string {
  return utcNoonToDate(dateToUtcNoon(date) + n * DAY_MS);
}

function weekdayOf(date: string): Weekday {
  return JS_DAY_TO_CODE[new Date(dateToUtcNoon(date)).getUTCDay()] ?? "MO";
}

/** Monday-anchored start of the week containing `date`. */
function startOfWeek(date: string): string {
  const day = (new Date(dateToUtcNoon(date)).getUTCDay() + 6) % 7;
  return addDays(date, -day);
}

/** nth (or last) weekday of a month, as YYYY-MM-DD, or null. */
function nthWeekdayOfMonth(
  year: number,
  month: number /* 1-12 */,
  nth: 1 | 2 | 3 | 4 | 5 | "last",
  weekday: Weekday,
): string | null {
  if (!WEEKDAYS.includes(weekday)) return null;

  const occurrences: string[] = [];
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  let cursor = first;
  while (Number(cursor.slice(5, 7)) === month) {
    if (weekdayOf(cursor) === weekday) occurrences.push(cursor);
    cursor = addDays(cursor, 1);
  }
  if (occurrences.length === 0) return null;
  if (nth === "last") return occurrences[occurrences.length - 1] ?? null;
  return occurrences[nth - 1] ?? null;
}

/** True when `date` is within the recurrence's end condition. */
function notPastEnd(
  date: string,
  emittedCount: number,
  ends: RecurrenceEnd,
): boolean {
  if (ends.kind === "never") return true;
  if (ends.kind === "count") return emittedCount < ends.count;
  return date <= ends.until;
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
  const baseStart =
    base.startsAt instanceof Date ? base.startsAt : new Date(base.startsAt);
  const baseEnd =
    base.endsAt instanceof Date ? base.endsAt : new Date(base.endsAt);
  const durationMs = baseEnd.getTime() - baseStart.getTime();

  if (!recurrence) {
    if (baseEnd < fromDate || baseStart > toDate) return [];
    return [{ startsAt: baseStart, endsAt: baseEnd, isOriginal: true }];
  }

  // The event's wall time — the thing that must not move.
  const baseWall = toParishWallClock(baseStart);
  const baseDate = parishDateString(baseStart);
  const windowStart = parishDateString(fromDate);
  const windowEnd = parishDateString(toDate);

  /**
   * Exceptions are compared on the parish calendar day, not on an exact
   * timestamp.
   *
   * The old version compared ISO strings for exact equality, and the editor
   * built those strings from the browser's local hours while expansion used
   * UTC hours. For anybody outside UTC the two never matched, so cancelling
   * a week silently did nothing and looked like a broken button. A cancelled
   * date is a cancelled day; the clock time was never the point.
   */
  const exceptions = new Set(
    exceptionDates
      .map((raw) => {
        // A bare YYYY-MM-DD is already a calendar day and means exactly
        // what it says. Reading it through a timezone would shift it.
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? raw.slice(0, 10) : parishDateString(d);
      })
      .filter(Boolean),
  );

  const out: EventInstance[] = [];
  let emitted = 0;

  /** Turn a parish calendar day into a real instant at the event's time. */
  const instantOn = (date: string): Date =>
    fromParishWallClock({
      year: Number(date.slice(0, 4)),
      month: Number(date.slice(5, 7)),
      day: Number(date.slice(8, 10)),
      hour: baseWall.hour,
      minute: baseWall.minute,
    } satisfies WallClock);

  /** Record one occurrence. Returns false when the date is cancelled. */
  const take = (date: string): boolean => {
    // A cancelled week is not an occurrence at all. It neither appears nor
    // counts against a "10 sessions" rule — an editor who cancels one date
    // is not asking for one fewer meeting, which is what the WordPress
    // version quietly did.
    if (exceptions.has(date)) return false;

    if (date >= windowStart && date <= windowEnd) {
      const startsAt = instantOn(date);
      if (startsAt >= baseStart) {
        out.push({
          startsAt,
          endsAt: new Date(startsAt.getTime() + durationMs),
          isOriginal: date === baseDate,
        });
      }
    }
    return true;
  };

  if (recurrence.freq === "weekly") {
    const byday = recurrence.byday;
    if (byday.length === 0) return [];

    let cursor = startOfWeek(baseDate);
    let safety = 0;
    outer: while (safety++ < SAFETY_MAX && cursor <= windowEnd) {
      for (let i = 0; i < 7; i++) {
        const day = addDays(cursor, i);
        if (!byday.includes(weekdayOf(day))) continue;
        if (day < baseDate) continue;
        if (day > windowEnd) break outer;
        // The end condition is checked against the occurrence itself, not
        // against the Monday its week starts on. The old version tested the
        // week, so an occurrence could land days past the stated end date.
        if (!notPastEnd(day, emitted, recurrence.ends)) break outer;

        if (take(day)) emitted++;
      }
      cursor = addDays(cursor, 7 * Math.max(1, recurrence.interval));
    }
    return out;
  }

  // monthly_nth
  let year = Number(baseDate.slice(0, 4));
  let month = Number(baseDate.slice(5, 7));
  let safety = 0;
  while (safety++ < SAFETY_MAX) {
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    if (monthStart > windowEnd) break;

    const day = nthWeekdayOfMonth(
      year,
      month,
      recurrence.nth,
      recurrence.weekday,
    );
    if (day && day >= baseDate) {
      if (!notPastEnd(day, emitted, recurrence.ends)) break;
      if (day > windowEnd) break;
      if (take(day)) emitted++;
    }

    month += Math.max(1, recurrence.interval);
    while (month > 12) {
      month -= 12;
      year += 1;
    }
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
  const out: Array<T & { occurrenceStartsAt: Date; occurrenceEndsAt: Date }> =
    [];
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
  out.sort(
    (a, b) => a.occurrenceStartsAt.getTime() - b.occurrenceStartsAt.getTime(),
  );
  return out;
}

/** Human-readable summary of a recurrence rule, for admin previews + public detail. */
export function summarizeRecurrence(r: Recurrence | null | undefined): string {
  if (!r) return "Does not repeat";
  const interval = Math.max(1, r.interval);
  if (r.freq === "weekly") {
    const days = r.byday.map(weekdayName).join(", ");
    const everyN =
      interval === 1
        ? "Every week"
        : interval === 2
          ? "Every other week"
          : `Every ${interval} weeks`;
    return `${everyN} on ${days}${endSuffix(r.ends)}`;
  }
  const ord = ordinal(r.nth);
  const everyN =
    interval === 1
      ? "Every month"
      : interval === 2
        ? "Every other month"
        : `Every ${interval} months`;
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
  if (ends.kind === "count")
    return ` · ${ends.count} occurrence${ends.count === 1 ? "" : "s"}`;
  return ` · until ${ends.until}`;
}

/**
 * Build the stored form of a cancelled date.
 *
 * Exposed so the admin editor and the expansion agree by construction
 * rather than by two people remembering the same convention.
 */
export function exceptionDateFor(date: string): string {
  return date.slice(0, 10);
}
