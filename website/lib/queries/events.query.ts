import { and, asc, desc, eq, gte, isNotNull, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { events } from "@/db/schema";

/**
 * Events queries. Wrapped in unstable_cache with the "events" tag so
 * admin mutations can call revalidateTag("events") to bust.
 * Public site only ever sees status = "published".
 *
 * Recurring events: queries below pull all published recurring events
 * regardless of their stored startsAt — callers pass them through
 * `expandEvent()` to materialize concrete instances within a date
 * window. SQL-side filtering only narrows non-recurring events.
 */

export const getFeaturedEvents = unstable_cache(
  async (limit = 4) =>
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.status, "published"),
          eq(events.isFeatured, true),
          or(isNotNull(events.recurrence), gte(events.startsAt, sql`now()`)),
        ),
      )
      .orderBy(asc(events.startsAt))
      .limit(limit),
  ["events:featured"],
  { tags: ["events"], revalidate: 3600 },
);

export const getUpcomingEvents = unstable_cache(
  async (limit = 100) =>
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.status, "published"),
          // Either it's a recurring event (caller will expand) OR a
          // non-recurring event whose start is still ahead of us.
          or(isNotNull(events.recurrence), gte(events.startsAt, sql`now()`)),
        ),
      )
      .orderBy(asc(events.startsAt))
      .limit(limit),
  ["events:upcoming"],
  { tags: ["events"], revalidate: 3600 },
);

export const getLatestFeaturedEvent = unstable_cache(
  async () =>
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.status, "published"),
          eq(events.isFeatured, true),
          or(isNotNull(events.recurrence), gte(events.startsAt, sql`now()`)),
        ),
      )
      .orderBy(asc(events.startsAt))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ["events:hero"],
  { tags: ["events"], revalidate: 3600 },
);

export const getEventBySlug = unstable_cache(
  async (slug: string) =>
    db
      .select()
      .from(events)
      .where(and(eq(events.slug, slug), eq(events.status, "published")))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ["events:by-slug"],
  { tags: ["events"], revalidate: 3600 },
);

export const getRecentPastEvents = unstable_cache(
  async (limit = 3) =>
    db
      .select()
      .from(events)
      .where(eq(events.status, "published"))
      .orderBy(desc(events.startsAt))
      .limit(limit),
  ["events:recent-past"],
  { tags: ["events"], revalidate: 3600 },
);
