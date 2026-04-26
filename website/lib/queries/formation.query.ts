import { and, asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import {
  FORMATION_CATEGORIES,
  formationPages,
  staff,
  type FormationCategory,
} from "@/db/schema";

export const getPublishedFormationPages = unstable_cache(
  async (category?: FormationCategory) => {
    const where = category
      ? and(eq(formationPages.status, "published"), eq(formationPages.category, category))
      : eq(formationPages.status, "published");
    return db
      .select({
        id: formationPages.id,
        slug: formationPages.slug,
        name: formationPages.name,
        summary: formationPages.summary,
        category: formationPages.category,
        photoBlobKey: formationPages.photoBlobKey,
        orderingPriority: formationPages.orderingPriority,
      })
      .from(formationPages)
      .where(where)
      .orderBy(asc(formationPages.orderingPriority), asc(formationPages.name));
  },
  ["formation:published"],
  { tags: ["formation"], revalidate: 600 },
);

export const getFormationBySlug = unstable_cache(
  async (slug: string) =>
    db
      .select({
        page: formationPages,
        leadStaff: {
          id: staff.id,
          slug: staff.slug,
          name: staff.name,
          role: staff.role,
          email: staff.email,
        },
      })
      .from(formationPages)
      .leftJoin(staff, eq(formationPages.leadStaffId, staff.id))
      .where(
        and(eq(formationPages.slug, slug), eq(formationPages.status, "published")),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ["formation:by-slug"],
  { tags: ["formation", "staff"], revalidate: 600 },
);

export { FORMATION_CATEGORIES };
