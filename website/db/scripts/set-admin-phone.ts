/**
 * One-off utility: set a user's phone in E.164 format.
 *
 *   pnpm tsx --env-file=.env.local db/scripts/set-admin-phone.ts +19085551234 [email]
 *
 * Defaults to the day-1 admin if no email is given. Useful for
 * replacing the seed placeholder before SMS sign-in is exercised.
 */

import { eq } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema";

const phone = process.argv[2];
const email = process.argv[3] ?? "mboyle@sainthelen.org";

if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone)) {
  console.error(
    "Usage: pnpm tsx --env-file=.env.local db/scripts/set-admin-phone.ts +1XXXXXXXXXX [email]",
  );
  console.error("Phone must be E.164 format (leading +, then country code).");
  process.exit(1);
}

async function main() {
  const [updated] = await db
    .update(users)
    .set({ phone })
    .where(eq(users.email, email))
    .returning({ email: users.email, role: users.role });

  if (!updated) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }

  console.log(`✓ Updated ${updated.email} (${updated.role}) — phone set.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
