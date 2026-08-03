import { PARISH_TZ, formatInParish, parishDateString } from "@/lib/timezone";

/**
 * Date helpers.
 *
 * Drizzle returns Date objects at the driver boundary, but Next's
 * unstable_cache serializes through JSON — which turns Dates into
 * ISO strings. Consumers that read cached query results therefore
 * get `Date | string`. `toDate` normalizes both shapes.
 *
 * **Every formatter here renders on the parish clock.** They used to omit
 * the timezone, which meant output followed whatever the machine was set
 * to — Eastern on a staff laptop, UTC on Vercel. An evening event rendered
 * a day late in production for anything after 8pm.
 */

export function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

export function formatMonthShort(v: Date | string): string {
  return formatInParish(toDate(v), { month: "short" });
}

export function formatMonthLong(v: Date | string): string {
  return formatInParish(toDate(v), { month: "long" });
}

export function formatWeekdayShort(v: Date | string): string {
  return formatInParish(toDate(v), { weekday: "short" });
}

export function formatWeekdayLong(v: Date | string): string {
  return formatInParish(toDate(v), { weekday: "long" });
}

export function formatDayOfMonth(v: Date | string): string {
  return formatInParish(toDate(v), { day: "numeric" });
}

export function formatTimeOfDay(v: Date | string): string {
  return formatInParish(toDate(v), {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * `YYYY-MM` for grouping.
 *
 * Two fixes in one line: it uses the parish month, so a 7pm event on the
 * last day of a month does not group under the next one; and the month is
 * no longer zero-indexed, which it was — every key was a month out.
 */
export function monthKey(v: Date | string): string {
  return parishDateString(toDate(v)).slice(0, 7);
}

export { PARISH_TZ };
