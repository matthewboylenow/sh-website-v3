import { desc, isNotNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { bulletins } from "@/db/schema";

export const getPublishedBulletins = unstable_cache(
  async (limit = 60) =>
    db
      .select()
      .from(bulletins)
      .where(isNotNull(bulletins.publishedAt))
      .orderBy(desc(bulletins.weekOf))
      .limit(limit),
  ["bulletins:published"],
  { tags: ["bulletins"], revalidate: 600 },
);
