import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { ministries } from "@/db/schema";

export const getPublishedMinistries = unstable_cache(
  async () =>
    db
      .select()
      .from(ministries)
      .where(eq(ministries.status, "published"))
      .orderBy(asc(ministries.orderingPriority), asc(ministries.name)),
  ["ministries:published"],
  { tags: ["ministries"], revalidate: 3600 },
);

/** First two published ministries ordered by orderingPriority — the
 * homepage "Find your place" spotlight. */
export const getSpotlightMinistries = unstable_cache(
  async (limit = 2) =>
    db
      .select()
      .from(ministries)
      .where(eq(ministries.status, "published"))
      .orderBy(asc(ministries.orderingPriority), asc(ministries.name))
      .limit(limit),
  ["ministries:spotlight"],
  { tags: ["ministries"], revalidate: 3600 },
);
