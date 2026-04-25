/**
 * Date helpers.
 *
 * Drizzle returns Date objects at the driver boundary, but Next's
 * unstable_cache serializes through JSON — which turns Dates into
 * ISO strings. Consumers that read cached query results therefore
 * get `Date | string`. `toDate` normalizes both shapes.
 */

export function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

export function formatMonthShort(v: Date | string): string {
  return toDate(v).toLocaleString("en-US", { month: "short" });
}

export function formatMonthLong(v: Date | string): string {
  return toDate(v).toLocaleString("en-US", { month: "long" });
}

export function formatWeekdayShort(v: Date | string): string {
  return toDate(v).toLocaleString("en-US", { weekday: "short" });
}

export function formatWeekdayLong(v: Date | string): string {
  return toDate(v).toLocaleString("en-US", { weekday: "long" });
}

export function formatTimeOfDay(v: Date | string): string {
  return toDate(v).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function monthKey(v: Date | string): string {
  const d = toDate(v);
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}
