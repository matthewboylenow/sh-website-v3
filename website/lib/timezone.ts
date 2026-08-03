/**
 * The parish's own clock.
 *
 * Saint Helen is in Westfield, New Jersey. Vercel runs in UTC, a staff
 * member's laptop runs in whatever they are sitting in, and Postgres stores
 * instants. Three different ideas of "now", and every date bug on this site
 * so far has come from mixing them.
 *
 * The rule this file exists to enforce: a Mass at 7pm is at 7pm all year.
 * Not 7pm in summer and 6pm in winter, which is what happens if you carry a
 * fixed UTC offset across a daylight-saving boundary.
 *
 * No dependency. Intl has the tz database built in, and using it is more
 * reliable than shipping a copy of it.
 */

export const PARISH_TZ = "America/New_York";

export type WallClock = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
};

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PARISH_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** What the parish clock reads at a given instant. */
export function toParishWallClock(instant: Date): WallClock {
  const parts = partsFormatter.formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    // Intl renders midnight as 24 in hour12:false on some engines.
    hour: get("hour") % 24,
    minute: get("minute"),
  };
}

/** The parish's offset from UTC, in minutes, at a given instant. */
export function parishOffsetMinutes(instant: Date): number {
  const wall = toParishWallClock(instant);
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
  );
  // Seconds are dropped on both sides, so round the instant down to the
  // minute before comparing or the difference is off by up to 59 seconds.
  const flooredInstant = Math.floor(instant.getTime() / 60000) * 60000;
  return (asUtc - flooredInstant) / 60000;
}

/**
 * The instant at which the parish clock reads this wall time.
 *
 * Two passes. The first guess treats the wall time as UTC and asks what the
 * offset is around then; the second corrects using the offset that actually
 * applies at the corrected instant. That second pass is what makes the
 * spring-forward and fall-back weekends come out right.
 *
 * Ambiguity is resolved the way people expect:
 *   - 2:30am on the spring-forward morning does not exist. It resolves to
 *     3:30am, the same instant the clock jumps to.
 *   - 1:30am on the fall-back morning happens twice. It resolves to the
 *     first one, which is what somebody scheduling an event means.
 */
export function fromParishWallClock(wall: WallClock): Date {
  const naive = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
  );

  // Offset is negative here — Eastern is behind UTC — so the instant is
  // later than the naive reading, hence minus.
  const offset1 = parishOffsetMinutes(new Date(naive));
  const candidate1 = new Date(naive - offset1 * 60000);

  const offset2 = parishOffsetMinutes(candidate1);
  if (offset2 === offset1) return candidate1;

  // The two readings disagree, so this wall time sits on a transition.
  const candidate2 = new Date(naive - offset2 * 60000);
  if (sameWallClock(toParishWallClock(candidate2), wall)) return candidate2;

  // Neither candidate reads back as the requested time, which means the
  // requested time never happens — 2:30am on the spring-forward morning.
  // candidate1 lands on the instant the clock jumps to, which is what
  // people mean.
  return candidate1;
}

function sameWallClock(a: WallClock, b: WallClock): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute
  );
}

/** `YYYY-MM-DD` for a given instant, on the parish clock. */
export function parishDateString(instant: Date): string {
  const w = toParishWallClock(instant);
  return `${w.year}-${String(w.month).padStart(2, "0")}-${String(w.day).padStart(2, "0")}`;
}

/** Today, on the parish clock. */
export function parishToday(now: Date = new Date()): string {
  return parishDateString(now);
}

/** Parse `YYYY-MM-DD` into its calendar parts. No timezone applied. */
export function parseDateParts(date: string): {
  year: number;
  month: number;
  day: number;
} {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

/** Format an instant for display, always on the parish clock. */
export function formatInParish(
  instant: Date,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: PARISH_TZ,
  }).format(instant);
}
