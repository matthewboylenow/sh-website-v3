import { and, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  answerFeedback,
  answerRateLimits,
  answerSearches,
} from "@/db/schema";
import { scrubQuery } from "@/lib/answers/scrub";
import { signFeedbackToken, verifyFeedbackToken } from "@/lib/answers/session";

/**
 * The write paths, against a real database.
 *
 * The rate limiter is one upsert whose whole correctness lives in a SQL CASE
 * expression, and the write-once rule is a conditional UPDATE. Neither can
 * be checked without Postgres, and both are the sort of thing that looks
 * right and is not.
 *
 * Skips silently unless TEST_DATABASE_URL is set.
 */

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

const MAX = 30;
const WINDOW_SECONDS = 60;

suite("the answer engine write paths", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(() => {
    process.env.AUTH_SECRET ??= "test-secret-for-the-answer-engine";
    pool = new Pool({ connectionString: url });
    db = drizzle(pool);
  });

  beforeEach(async () => {
    await db.delete(answerFeedback);
    await db.delete(answerSearches);
    await db.delete(answerRateLimits);
  });

  afterAll(async () => {
    await db.delete(answerFeedback);
    await db.delete(answerSearches);
    await db.delete(answerRateLimits);
    await pool.end();
  });

  /** Mirrors lib/answers/rate-limit.ts against this pool. */
  async function consume(hash: string, now: Date) {
    const windowStart = new Date(now.getTime() - WINDOW_SECONDS * 1000);
    const rows = await db
      .insert(answerRateLimits)
      .values({ sessionHash: hash, count: 1, windowStartedAt: now })
      .onConflictDoUpdate({
        target: answerRateLimits.sessionHash,
        set: {
          count: sql`CASE
            WHEN ${answerRateLimits.windowStartedAt} < ${windowStart.toISOString()}
            THEN 1 ELSE ${answerRateLimits.count} + 1 END`,
          windowStartedAt: sql`CASE
            WHEN ${answerRateLimits.windowStartedAt} < ${windowStart.toISOString()}
            THEN ${now.toISOString()} ELSE ${answerRateLimits.windowStartedAt} END`,
        },
      })
      .returning({ count: answerRateLimits.count });
    const count = rows[0]!.count;
    return { ok: count <= MAX, count };
  }

  describe("the rate limiter", () => {
    const now = new Date("2026-08-02T15:00:00Z");

    it("allows the first thirty events and refuses the thirty-first", async () => {
      for (let i = 1; i <= MAX; i++) {
        expect((await consume("visitor-a", now)).ok, `event ${i}`).toBe(true);
      }
      expect((await consume("visitor-a", now)).ok).toBe(false);
    });

    it("counts each visitor separately", async () => {
      for (let i = 0; i < MAX; i++) await consume("visitor-b", now);
      expect((await consume("visitor-b", now)).ok).toBe(false);
      expect((await consume("visitor-c", now)).ok).toBe(true);
    });

    it("releases a visitor once their window has passed", async () => {
      for (let i = 0; i < MAX; i++) await consume("visitor-d", now);
      expect((await consume("visitor-d", now)).ok).toBe(false);

      const later = new Date(now.getTime() + 61_000);
      const released = await consume("visitor-d", later);
      expect(released.ok).toBe(true);
      // A fixed window, so the count restarts rather than decaying.
      expect(released.count).toBe(1);
    });

    it("does not extend the window on every event", async () => {
      // WordPress refreshed the expiry on each accepted write, so a busy
      // visitor was never released until they stopped entirely. That is a
      // different rule from the one its own code claimed.
      const start = new Date("2026-08-02T15:00:00Z");
      for (let i = 0; i < 5; i++) {
        await consume("visitor-e", new Date(start.getTime() + i * 10_000));
      }
      const [row] = await db
        .select()
        .from(answerRateLimits)
        .where(eq(answerRateLimits.sessionHash, "visitor-e"));
      expect(row!.windowStartedAt.toISOString()).toBe(start.toISOString());
    });

    it("is atomic under concurrent requests", async () => {
      // Read-then-write would let two simultaneous requests both see the
      // same count and both pass.
      const results = await Promise.all(
        Array.from({ length: 40 }, () => consume("visitor-f", now)),
      );
      expect(results.filter((r) => r.ok)).toHaveLength(MAX);
    });
  });

  describe("search logging", () => {
    it("scrubs contact details out of the search term", async () => {
      // WordPress scrubbed the follow-up sentence and kept the raw search
      // term in the clear for 400 days.
      const raw = "who do I call about a funeral 908-232-1214";
      const [row] = await db
        .insert(answerSearches)
        .values({
          query: scrubQuery(raw),
          queryNorm: "who do i call about a funeral",
          resultKind: "card",
          sessionHash: "visitor-g",
        })
        .returning({ query: answerSearches.query });
      expect(row!.query).toContain("[removed]");
      expect(row!.query).not.toContain("908");
    });

    it("stores what was on screen and what matched separately", async () => {
      const [row] = await db
        .insert(answerSearches)
        .values({
          query: "mass",
          queryNorm: "mass",
          resultKind: "card",
          resultCount: 2,
          matchCount: 9,
          sessionHash: "visitor-h",
        })
        .returning();
      expect(row!.resultCount).toBe(2);
      expect(row!.matchCount).toBe(9);
    });
  });

  describe("click attribution", () => {
    it("only lets the visitor who searched mark their own row", async () => {
      // WordPress updated on id alone, so anyone could mark any search as
      // clicked and write an arbitrary URL that the admin then displayed.
      const [s] = await db
        .insert(answerSearches)
        .values({
          query: "bulletin",
          queryNorm: "bulletin",
          resultKind: "card",
          sessionHash: "visitor-i",
        })
        .returning({ id: answerSearches.id });

      const attempt = (hash: string, url: string) =>
        db
          .update(answerSearches)
          .set({ clicked: true, clickedUrl: url })
          .where(
            and(
              eq(answerSearches.id, s!.id),
              eq(answerSearches.sessionHash, hash),
            ),
          )
          .returning({ id: answerSearches.id });

      expect(await attempt("visitor-intruder", "https://evil.example")).toHaveLength(0);
      expect(await attempt("visitor-i", "/bulletin")).toHaveLength(1);

      const [row] = await db
        .select()
        .from(answerSearches)
        .where(eq(answerSearches.id, s!.id));
      expect(row!.clickedUrl).toBe("/bulletin");
    });
  });

  describe("the follow-up sentence", () => {
    async function leaveANo(hash: string) {
      const [row] = await db
        .insert(answerFeedback)
        .values({ cardKey: "baptism", helpful: false, sessionHash: hash })
        .returning({ id: answerFeedback.id });
      return row!.id;
    }

    const fill = (id: string, text: string) =>
      db
        .update(answerFeedback)
        .set({ wanted: text, wantedAt: sql`now()` })
        .where(and(eq(answerFeedback.id, id), isNull(answerFeedback.wanted)))
        .returning({ id: answerFeedback.id });

    it("accepts a valid token and writes once", async () => {
      const id = await leaveANo("visitor-j");
      const token = signFeedbackToken(id);
      expect(verifyFeedbackToken(token)).toBe(id);
      expect(await fill(id, "I wanted the godparent rules")).toHaveLength(1);
      expect(await fill(id, "second thoughts")).toHaveLength(0);
    });

    it("survives the visitor's address changing mid-sentence", async () => {
      // The WordPress version re-derived identity from address and agent,
      // so a phone handing over from wifi to cellular between the vote and
      // the sentence silently dropped it, with a thank-you shown anyway.
      const id = await leaveANo("visitor-k-on-wifi");
      const token = signFeedbackToken(id);
      // Different network, same token.
      expect(verifyFeedbackToken(token)).toBe(id);
      expect(await fill(id, "typed from cellular")).toHaveLength(1);
    });

    it("refuses a token for a different row", async () => {
      const mine = await leaveANo("visitor-l");
      const theirs = await leaveANo("visitor-m");
      const forged = signFeedbackToken(mine).replace(mine, theirs);
      expect(verifyFeedbackToken(forged)).toBeNull();
    });

    it("scrubs the sentence before it is written", async () => {
      const id = await leaveANo("visitor-n");
      const { scrubFreeText } = await import("@/lib/answers/scrub");
      await fill(id, scrubFreeText("call me on 908-232-1214 about the 5:30 mass"));
      const [row] = await db
        .select()
        .from(answerFeedback)
        .where(eq(answerFeedback.id, id));
      expect(row!.wanted).toContain("[removed]");
      // The part worth reading survives.
      expect(row!.wanted).toContain("5:30 mass");
    });

    it("leaves wantedAt set so a wiped sentence is distinguishable", async () => {
      const id = await leaveANo("visitor-o");
      await fill(id, "something useful");
      await db
        .update(answerFeedback)
        .set({ wanted: null })
        .where(eq(answerFeedback.id, id));
      const [row] = await db
        .select()
        .from(answerFeedback)
        .where(eq(answerFeedback.id, id));
      expect(row!.wanted).toBeNull();
      expect(row!.wantedAt).not.toBeNull();
    });
  });
});
