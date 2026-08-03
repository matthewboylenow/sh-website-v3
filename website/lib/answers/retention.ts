import { and, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { answerFeedback, answerSearches } from "@/db/schema";
import { ROW_RETENTION_DAYS, WANTED_RETENTION_DAYS } from "./limits";
import { pruneRateLimits } from "./rate-limit";

/**
 * Retention.
 *
 * The free text goes first and on a much shorter clock. By six months a
 * sentence somebody typed has either been read and acted on or it never will
 * be, and there is no good reason for a parish to be sitting on it after
 * that. The row stays, so the counts and the trend are unaffected.
 *
 * `wantedAt` is deliberately left in place after the wipe, so a report can
 * still tell "nobody typed anything" apart from "somebody did, and it has
 * since been cleared".
 */

const DAY_MS = 86_400_000;

export type PruneResult = {
  searchesDeleted: number;
  feedbackDeleted: number;
  sentencesWiped: number;
};

export async function pruneAnswerData(
  now: Date = new Date(),
): Promise<PruneResult> {
  const rowCutoff = new Date(now.getTime() - ROW_RETENTION_DAYS * DAY_MS);
  const textCutoff = new Date(now.getTime() - WANTED_RETENTION_DAYS * DAY_MS);

  // Sentences first. If the run dies halfway, the thing that matters most
  // has already gone.
  const wiped = await db
    .update(answerFeedback)
    .set({ wanted: null })
    .where(
      and(
        isNotNull(answerFeedback.wanted),
        lt(answerFeedback.wantedAt, textCutoff),
      ),
    )
    .returning({ id: answerFeedback.id });

  const feedbackGone = await db
    .delete(answerFeedback)
    .where(lt(answerFeedback.createdAt, rowCutoff))
    .returning({ id: answerFeedback.id });

  // Searches last. Feedback rows reference them, and the foreign key is
  // ON DELETE SET NULL, so a vote outlives its search rather than
  // disappearing with it.
  const searchesGone = await db
    .delete(answerSearches)
    .where(lt(answerSearches.createdAt, rowCutoff))
    .returning({ id: answerSearches.id });

  await pruneRateLimits(now);

  return {
    searchesDeleted: searchesGone.length,
    feedbackDeleted: feedbackGone.length,
    sentencesWiped: wiped.length,
  };
}

/** Counts the retention screen shows, so the promise is checkable. */
export async function getRetentionStatus(now: Date = new Date()) {
  const textCutoff = new Date(now.getTime() - WANTED_RETENTION_DAYS * DAY_MS);

  const [row] = await db
    .select({
      sentences: sql<number>`count(*) filter (where ${answerFeedback.wanted} is not null)::int`,
      overdue: sql<number>`count(*) filter (
        where ${answerFeedback.wanted} is not null
          and ${answerFeedback.wantedAt} < ${textCutoff.toISOString()}
      )::int`,
    })
    .from(answerFeedback);

  return {
    sentencesHeld: row?.sentences ?? 0,
    sentencesOverdue: row?.overdue ?? 0,
    wantedRetentionDays: WANTED_RETENTION_DAYS,
    rowRetentionDays: ROW_RETENTION_DAYS,
  };
}
