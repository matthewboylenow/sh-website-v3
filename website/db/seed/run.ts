/**
 * Seed runner — applies site-settings + dev fixtures in order.
 * Invoked by `pnpm db:seed`.
 */

import { seedDev } from "./dev";
import { seedSiteSettings } from "./site-settings";

async function main() {
  console.log("\nSeeding Saint Helen development DB\n");
  await seedSiteSettings();
  await seedDev();
  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error("\nSeed failed:\n", err);
  process.exit(1);
});
