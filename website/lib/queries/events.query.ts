import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { events } from "@/db/schema";

/**
 * Events queries. Wrapped in unstable_cache with the "events" tag so
 * admin mutations can call revalidateTag("events") to bust.
 * Public site only ever sees status = "published".
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
          gte(events.startsAt, sql`now()`),
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
        and(eq(events.status, "published"), gte(events.startsAt, sql`now()`)),
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
          gte(events.startsAt, sql`now()`),
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
