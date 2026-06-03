/**
 * One-shot: set canonicalUrl on the 12 standalone ministries to their
 * root home (/adoration, /music, …). Run after creating the root routes
 * so /ministries/<slug>'s canonical points at the new home.
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { ministries } from "../db/schema";
import { STANDALONE_SLUGS } from "../lib/ministry-route";

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://sainthelen.org";

async function main() {
  let updated = 0;
  for (const slug of STANDALONE_SLUGS) {
    const newCanonical = `${SITE_ORIGIN}/${slug}`;
    const result = await db
      .update(ministries)
      .set({ canonicalUrl: newCanonical, updatedAt: new Date() })
      .where(eq(ministries.slug, slug))
      .returning({ id: ministries.id });
    if (result.length === 0) {
      console.log(`  x not found: ${slug}`);
    } else {
      console.log(`  ok ${slug.padEnd(24)} canonical=${newCanonical}`);
      updated++;
    }
  }
  console.log(`\nUpdated canonicalUrl on ${updated}/${STANDALONE_SLUGS.length} ministries.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
