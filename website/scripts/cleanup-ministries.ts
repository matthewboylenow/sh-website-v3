/**
 * Cleanup pass — archive the 6 dev-placeholder ministries that aren't
 * in the May 2026 audit master list, then publish the 47 audit-imported
 * ministries that are currently in draft.
 *
 * Why archive instead of delete: existing inquiries / events / inquiry
 * email tokens may FK-reference these rows. Archiving hides them from
 * the public site (status filter excludes 'archived') while keeping
 * the rows so historical references don't break.
 *
 * Why bulk publish: the user reviewed the audit content and confirmed
 * all 47 have either rich blocks, a button to /p/<slug>, or audit
 * guidance — none render as "Content coming soon". Faster than
 * publishing one by one in admin.
 */

import { eq, inArray, ne } from "drizzle-orm";
import { db } from "../db";
import { ministries } from "../db/schema";

const PLACEHOLDER_SLUGS = [
  "choir",
  "knights-of-columbus",
  "rcia",
  "mothers-group",
  "st-vincent-de-paul",
  "bible-study",
];

async function main() {
  // 1. Archive placeholders
  const archived = await db
    .update(ministries)
    .set({ status: "archived", updatedAt: new Date() })
    .where(inArray(ministries.slug, PLACEHOLDER_SLUGS))
    .returning({ slug: ministries.slug });
  console.log(`Archived ${archived.length} placeholder ministries:`);
  archived.forEach((m) => console.log(`  - ${m.slug}`));

  // 2. Bulk publish remaining drafts
  const published = await db
    .update(ministries)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(ministries.status, "draft"))
    .returning({ slug: ministries.slug });
  console.log(`\nPublished ${published.length} draft ministries:`);
  published.forEach((m) => console.log(`  + ${m.slug}`));

  // 3. Summary
  const counts = await db.select({ status: ministries.status }).from(ministries);
  const tally: Record<string, number> = {};
  for (const c of counts) tally[c.status] = (tally[c.status] ?? 0) + 1;
  console.log(`\nFinal counts: ${JSON.stringify(tally)}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
