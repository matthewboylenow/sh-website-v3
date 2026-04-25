import { and, asc, eq, isNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { massTimes, staff } from "@/db/schema";

/**
 * Mass times queries. The schema allows both a weekly recurring
 * pattern (dayOfWeek 0–6) and one-off override rows (dayOfWeek null,
 * overrideDate set). These queries return the weekly pattern only —
 * override expansion happens in the Mass page's Server Component when
 * a specific day is rendered.
 */

export const getWeeklyMassTimes = unstable_cache(
  async () =>
    db
      .select({
        id: massTimes.id,
        dayOfWeek: massTimes.dayOfWeek,
        time: massTimes.time,
        kind: massTimes.kind,
        label: massTimes.label,
        liveStreamUrl: massTimes.liveStreamUrl,
        notes: massTimes.notes,
        presider: {
          id: staff.id,
          name: staff.name,
          role: staff.role,
        },
      })
      .from(massTimes)
      .leftJoin(staff, eq(massTimes.presiderId, staff.id))
      .where(eq(massTimes.isActive, true))
      .orderBy(
        asc(massTimes.dayOfWeek),
        asc(massTimes.time),
      ),
  ["mass-times:weekly"],
  { tags: ["mass-times"], revalidate: 3600 },
);

/** Rows scheduled for a specific day-of-week. Excludes override rows. */
export async function getMassTimesForDayOfWeek(day: number) {
  return db
    .select({
      id: massTimes.id,
      dayOfWeek: massTimes.dayOfWeek,
      time: massTimes.time,
      kind: massTimes.kind,
      label: massTimes.label,
      liveStreamUrl: massTimes.liveStreamUrl,
      notes: massTimes.notes,
      presider: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
      },
    })
    .from(massTimes)
    .leftJoin(staff, eq(massTimes.presiderId, staff.id))
    .where(
      and(
        eq(massTimes.dayOfWeek, day),
        eq(massTimes.isActive, true),
        isNull(massTimes.overrideDate),
      ),
    )
    .orderBy(asc(massTimes.time));
}
