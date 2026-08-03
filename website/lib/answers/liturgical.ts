import { LITURGICAL_RULES, type LiturgicalRule } from "./types";

/**
 * The liturgical calendar, so seasonal cards stay right for years without
 * anyone typing a date. Ported from class-sha-seasonal.php.
 *
 * Everything here works on `YYYY-MM-DD` strings and plain UTC date maths.
 * That is deliberate: these are calendar days, not instants. A feast does
 * not have a timezone, and pulling `Date` and its local-time accessors into
 * this would reintroduce the off-by-one-at-midnight class of bug that the
 * events code already has.
 */

const DAY_MS = 86_400_000;

/** Anonymous Gregorian computus — the same algorithm the Church uses. */
export function easter(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDate(year, month, day);
}

function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse `YYYY-MM-DD` (or the date half of a longer string) to a UTC epoch. */
export function parseDate(date: string): number {
  return Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  );
}

/** Format a UTC epoch back to `YYYY-MM-DD`. */
export function formatDate(ms: number): string {
  const d = new Date(ms);
  return isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Shift a `YYYY-MM-DD` by whole days. */
export function shiftDays(date: string, days: number): string {
  return formatDate(parseDate(date) + days * DAY_MS);
}

/** The date of a feast in a given year, or null for an unknown rule. */
export function dateFor(rule: string, year: number): string | null {
  switch (rule) {
    case "easter":
      return easter(year);
    case "ash_wednesday":
      return shiftDays(easter(year), -46);
    case "palm_sunday":
      return shiftDays(easter(year), -7);
    case "holy_thursday":
      return shiftDays(easter(year), -3);
    case "good_friday":
      return shiftDays(easter(year), -2);
    case "pentecost":
      return shiftDays(easter(year), 49);
    case "christmas":
      return isoDate(year, 12, 25);
    case "immaculate":
      return isoDate(year, 12, 8);
    case "all_saints":
      return isoDate(year, 11, 1);
    case "all_souls":
      return isoDate(year, 11, 2);
    case "advent_start": {
      // The fourth Sunday before Christmas Day. When Christmas itself is a
      // Sunday we go back a full week, not zero.
      const xmas = isoDate(year, 12, 25);
      const dow = new Date(parseDate(xmas)).getUTCDay();
      return shiftDays(xmas, -((dow === 0 ? 7 : dow) + 21));
    }
    default:
      return null;
  }
}

/**
 * The next occurrence of a feast on or after `today`, looking six years
 * ahead. Returns null for an unknown rule.
 *
 * FIX: WordPress returned an empty string for an unknown rule, and the
 * caller treated that as "this moment does not exist", so a typo in a rule
 * name made the line silently vanish with no error anywhere. Null is
 * explicit and the caller is now required to handle it.
 */
export function nextOccurrence(rule: string, today: string): string | null {
  const startYear = Number(today.slice(0, 4));
  for (let i = 0; i < 6; i++) {
    const d = dateFor(rule, startYear + i);
    if (d && d >= today) return d;
  }
  return null;
}

export function isLiturgicalRule(value: unknown): value is LiturgicalRule {
  return (
    typeof value === "string" &&
    (LITURGICAL_RULES as readonly string[]).includes(value)
  );
}
