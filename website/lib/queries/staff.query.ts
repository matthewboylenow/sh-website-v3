import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { staff } from "@/db/schema";

export const getActiveStaff = unstable_cache(
  async () =>
    db
      .select()
      .from(staff)
      .where(eq(staff.isActive, true))
      .orderBy(asc(staff.orderingPriority), asc(staff.name)),
  ["staff:active"],
  { tags: ["staff"], revalidate: 3600 },
);

export const getPastor = unstable_cache(
  async () =>
    db
      .select()
      .from(staff)
      .where(eq(staff.isActive, true))
      .orderBy(asc(staff.orderingPriority))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ["staff:pastor"],
  { tags: ["staff"], revalidate: 3600 },
);
