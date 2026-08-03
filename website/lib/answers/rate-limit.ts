import { sql } from "drizzle-orm";
import { db } from "@/db";
import { answerRateLimits } from "@/db/schema";
import { RATE_MAX_EVENTS, RATE_WINDOW_SECONDS } from "./limits";

export { RATE_MAX_EVENTS, RATE_WINDOW_SECONDS };

/**
 * Rate limiting for the public answer endpoints.
 *
 * In Postgres rather than Redis on purpose. Parish traffic is a few thousand
 * searches a month; a second service to pay for and remember is worth more
 * than the microseconds it would save. The whole thing is one upsert.
 *
 * The window is fixed, not sliding. WordPress refreshed the expiry on every
 * accepted event, so a busy visitor was never released until they stopped —
 * which is a different rule from the one the code claimed.
 */


export type RateResult = { ok: boolean; remaining: number };

/**
 * Count one event against a visitor's allowance.
 *
 * Atomic: the whole decision happens inside a single statement, so two
 * requests arriving together cannot both read the same count and pass.
 */
export async function consumeRateLimit(
  sessionHash: string,
  now: Date = new Date(),
): Promise<RateResult> {
  const windowStart = new Date(now.getTime() - RATE_WINDOW_SECONDS * 1000);

  const rows = await db
    .insert(answerRateLimits)
    .values({ sessionHash, count: 1, windowStartedAt: now })
    .onConflictDoUpdate({
      target: answerRateLimits.sessionHash,
      set: {
        // A stale window resets rather than accumulating.
        count: sql`CASE
          WHEN ${answerRateLimits.windowStartedAt} < ${windowStart.toISOString()}
          THEN 1
          ELSE ${answerRateLimits.count} + 1
        END`,
        windowStartedAt: sql`CASE
          WHEN ${answerRateLimits.windowStartedAt} < ${windowStart.toISOString()}
          THEN ${now.toISOString()}
          ELSE ${answerRateLimits.windowStartedAt}
        END`,
      },
    })
    .returning({ count: answerRateLimits.count });

  const count = rows[0]?.count ?? RATE_MAX_EVENTS + 1;
  return { ok: count <= RATE_MAX_EVENTS, remaining: Math.max(0, RATE_MAX_EVENTS - count) };
}

/** Housekeeping — drop windows nobody is inside any more. */
export async function pruneRateLimits(now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - RATE_WINDOW_SECONDS * 1000 * 10);
  await db
    .delete(answerRateLimits)
    .where(sql`${answerRateLimits.windowStartedAt} < ${cutoff.toISOString()}`);
}
