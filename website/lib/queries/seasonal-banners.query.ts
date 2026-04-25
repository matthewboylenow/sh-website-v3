import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { seasonalBanners } from "@/db/schema";

/**
 * Returns the most recent banner whose date window includes now().
 * Null when no active banner — homepage omits the section in that case.
 */
export const getActiveSeasonalBanner = unstable_cache(
  async () =>
    db
      .select()
      .from(seasonalBanners)
      .where(
        and(
          eq(seasonalBanners.isActive, true),
          lte(seasonalBanners.startsAt, sql`now()`),
          gte(seasonalBanners.endsAt, sql`now()`),
        ),
      )
      .orderBy(desc(seasonalBanners.startsAt))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ["seasonal-banners:active"],
  { tags: ["seasonal-banners"], revalidate: 600 },
);
