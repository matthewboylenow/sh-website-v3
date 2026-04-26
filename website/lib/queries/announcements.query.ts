import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { announcements } from "@/db/schema";

/**
 * Returns the highest-priority announcement that's currently active —
 * status="published" AND (startsAt IS NULL OR startsAt <= now())
 *           AND (endsAt IS NULL OR endsAt >= now()).
 *
 * If multiple match, the one with the highest priority wins; ties broken
 * by most-recent updatedAt.
 */
export const getActiveAnnouncement = unstable_cache(
  async () =>
    db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.status, "published"),
          or(isNull(announcements.startsAt), lte(announcements.startsAt, sql`now()`)),
          or(isNull(announcements.endsAt), gte(announcements.endsAt, sql`now()`)),
        ),
      )
      .orderBy(desc(announcements.priority), desc(announcements.updatedAt))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ["announcements:active"],
  { tags: ["announcements"], revalidate: 60 },
);
