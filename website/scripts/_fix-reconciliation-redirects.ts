import { eq } from "drizzle-orm";
import { db } from "../db";
import { siteSettings } from "../db/schema";

const FIXES: Record<string, string> = {
  "/from-our-pastor": "/p/from-our-pastor",
  "/ocia-form": "/p/become-catholic",
};

async function main() {
  const [row] = await db
    .select({ redirects: siteSettings.redirects })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!row) throw new Error("siteSettings row not found.");
  const list = row.redirects ?? [];
  let touched = 0;
  for (const r of list) {
    if (FIXES[r.from]) {
      const prev = r.to;
      r.to = FIXES[r.from]!;
      r.permanent = true;
      console.log(`  fix ${r.from.padEnd(28)} ${prev} → ${r.to}`);
      touched++;
    }
  }
  if (touched === 0) {
    console.log("Nothing to fix.");
    return;
  }
  await db
    .update(siteSettings)
    .set({ redirects: list })
    .where(eq(siteSettings.id, 1));
  console.log(`\nFixed ${touched} redirect targets.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
