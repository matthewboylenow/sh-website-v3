import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";

/** Singleton read. Always row id = 1 (enforced by CHECK constraint). */
export const getSiteSettings = unstable_cache(
  async () =>
    db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, 1))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ["site-settings:singleton"],
  { tags: ["site-settings"], revalidate: 3600 },
);
