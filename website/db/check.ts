/**
 * Sanity check script — counts rows in every table and prints a summary.
 * Used after seeding to confirm expected data volumes. Safe to run
 * against prod (read-only).
 *
 *   pnpm db:check
 */

import { sql } from "drizzle-orm";
import { db } from "./index";
import {
  accounts,
  blobAssets,
  bulletins,
  events,
  massTimes,
  ministries,
  ministryEdits,
  seasonalBanners,
  sessions,
  siteSettings,
  staff,
  users,
  verificationTokens,
} from "./schema";

const tables = [
  { label: "users", t: users },
  { label: "accounts", t: accounts },
  { label: "sessions", t: sessions },
  { label: "verification_tokens", t: verificationTokens },
  { label: "site_settings", t: siteSettings },
  { label: "staff", t: staff },
  { label: "ministries", t: ministries },
  { label: "events", t: events },
  { label: "mass_times", t: massTimes },
  { label: "bulletins", t: bulletins },
  { label: "seasonal_banners", t: seasonalBanners },
  { label: "blob_assets", t: blobAssets },
  { label: "ministry_edits", t: ministryEdits },
] as const;

async function main() {
  const results = await Promise.all(
    tables.map(async ({ label, t }) => {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(t);
      return { label, n };
    }),
  );

  const pad = Math.max(...results.map((r) => r.label.length));
  console.log("\n  DB row counts");
  console.log("  " + "-".repeat(pad + 8));
  for (const { label, n } of results) {
    console.log(`  ${label.padEnd(pad)}  ${String(n).padStart(4)}`);
  }

  const adminCount = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`${users.role} = 'admin'`);
  console.log(`\n  admins: ${adminCount[0]?.n ?? 0}`);
  if ((adminCount[0]?.n ?? 0) === 0) {
    console.log(
      "  ⚠  no admin users found — run `pnpm db:seed` to seed the day-1 admin",
    );
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
