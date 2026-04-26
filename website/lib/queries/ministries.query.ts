import { and, asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { ministries, ministrySections, staff } from "@/db/schema";

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

export const getMinistryBySlug = unstable_cache(
  async (slug: string) =>
    db
      .select({
        ministry: ministries,
        leadStaff: {
          id: staff.id,
          slug: staff.slug,
          name: staff.name,
          role: staff.role,
          email: staff.email,
        },
      })
      .from(ministries)
      .leftJoin(staff, eq(ministries.leadStaffId, staff.id))
      .where(
        and(eq(ministries.slug, slug), eq(ministries.status, "published")),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ["ministries:by-slug"],
  { tags: ["ministries", "staff"], revalidate: 3600 },
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

export const getMinistrySections = unstable_cache(
  async (ministryId: string) =>
    db
      .select({
        id: ministrySections.id,
        kind: ministrySections.kind,
        position: ministrySections.position,
        payload: ministrySections.payload,
      })
      .from(ministrySections)
      .where(eq(ministrySections.ministryId, ministryId))
      .orderBy(asc(ministrySections.position)),
  ["ministry-sections:by-ministry"],
  { tags: ["ministries", "ministry-sections"], revalidate: 600 },
);

/** Distinct category values currently in use — for the /ministries
 *  filter sidebar. */
export const getMinistryCategoriesInUse = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await db
      .select({ category: ministries.category })
      .from(ministries)
      .where(eq(ministries.status, "published"));
    const seen = new Set<string>();
    for (const r of rows) {
      if (r.category) seen.add(r.category);
    }
    return [...seen].sort();
  },
  ["ministries:categories-in-use"],
  { tags: ["ministries"], revalidate: 3600 },
);
