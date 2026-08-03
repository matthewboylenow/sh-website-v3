import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  answerCards,
  answerFeedback,
  answerRateLimits,
  answerSearches,
} from "@/db/schema";

/**
 * The app's db handle uses @neondatabase/serverless, which speaks Neon's
 * HTTP protocol and cannot reach a plain Postgres. Point it at the test
 * pool so these tests exercise the real report functions rather than a
 * reimplementation of them — the whole value here is checking the actual
 * SQL, especially the window function.
 */
vi.mock("@/db", async () => {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const schema = await import("@/db/schema");
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  return { db: drizzle(pool, { schema }), schema, __pool: pool };
});

/**
 * The reports. These are the reason the feedback is collected at all, and
 * every one of them is a SQL aggregate that can be subtly wrong while
 * looking entirely plausible on screen.
 *
 * The window function in getUnhelpfulCards is the sharpest edge: get the
 * partition wrong and every card shows the same searches underneath it.
 */

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite("the answer reports", () => {
  let db: Awaited<typeof import("@/db")>["db"];
  let pool: { end: () => Promise<void> };

  beforeAll(async () => {
    process.env.AUTH_SECRET ??= "test-secret-for-the-answer-engine";
    const mod = (await import("@/db")) as unknown as {
      db: Awaited<typeof import("@/db")>["db"];
      __pool: { end: () => Promise<void> };
    };
    db = mod.db;
    pool = mod.__pool;
  });

  beforeEach(async () => {
    await db.delete(answerFeedback);
    await db.delete(answerSearches);
    await db.delete(answerRateLimits);
    await db.delete(answerCards);
  });

  afterAll(async () => {
    await db.delete(answerFeedback);
    await db.delete(answerSearches);
    await db.delete(answerRateLimits);
    await db.delete(answerCards);
    await pool.end();
  });

  const ago = (days: number) => new Date(Date.now() - days * 86_400_000);

  async function seedSearches() {
    await db.insert(answerSearches).values([
      { query: "mass times", queryNorm: "mass times", resultKind: "card", cardKey: "mass-times", clicked: true, createdAt: ago(1) },
      { query: "mass times", queryNorm: "mass times", resultKind: "card", cardKey: "mass-times", createdAt: ago(2) },
      { query: "parking", queryNorm: "parking", resultKind: "none", createdAt: ago(1) },
      { query: "parking", queryNorm: "parking", resultKind: "none", createdAt: ago(3) },
      { query: "parking lot", queryNorm: "parking lot", resultKind: "none", createdAt: ago(5) },
      { query: "gym", queryNorm: "gym", resultKind: "page", createdAt: ago(2) },
      // Outside the 30-day window.
      { query: "old thing", queryNorm: "old thing", resultKind: "none", createdAt: ago(200) },
    ]);
  }

  describe("getAnswerSummary", () => {
    it("counts each result kind and ignores anything older than the window", async () => {
      await seedSearches();
      const { getAnswerSummary } = await import("@/lib/answers/reports.query");
      const s = await getAnswerSummary(30);
      expect(s.total).toBe(6);
      expect(s.cards).toBe(2);
      expect(s.pages).toBe(1);
      expect(s.dead).toBe(3);
      expect(s.clicks).toBe(1);
      expect(s.distinct).toBe(4);
    });

    it("counts votes separately", async () => {
      await db.insert(answerFeedback).values([
        { cardKey: "mass-times", helpful: true },
        { cardKey: "mass-times", helpful: false },
        { cardKey: "baptism", helpful: false },
      ]);
      const { getAnswerSummary } = await import("@/lib/answers/reports.query");
      const s = await getAnswerSummary(30);
      expect(s.yes).toBe(1);
      expect(s.no).toBe(2);
    });

    it("returns zeroes rather than nulls on an empty database", async () => {
      const { getAnswerSummary } = await import("@/lib/answers/reports.query");
      const s = await getAnswerSummary(30);
      expect(s).toMatchObject({ total: 0, cards: 0, dead: 0, yes: 0, no: 0 });
    });
  });

  describe("getDeadEnds", () => {
    it("groups misses by normalised query, most common first", async () => {
      await seedSearches();
      const { getDeadEnds } = await import("@/lib/answers/reports.query");
      const rows = await getDeadEnds(90, 20);
      expect(rows[0]).toMatchObject({ query: "parking", count: 2 });
      expect(rows.map((r) => r.query)).toContain("parking lot");
      // Only misses — a card or page hit is not a dead end.
      expect(rows.map((r) => r.query)).not.toContain("mass times");
      expect(rows.map((r) => r.query)).not.toContain("gym");
    });

    it("respects the window", async () => {
      await seedSearches();
      const { getDeadEnds } = await import("@/lib/answers/reports.query");
      const recent = await getDeadEnds(30, 20);
      expect(recent.map((r) => r.query)).not.toContain("old thing");
      const wide = await getDeadEnds(365, 20);
      expect(wide.map((r) => r.query)).toContain("old thing");
    });
  });

  describe("getUnhelpfulCards", () => {
    async function seedVotes() {
      const [s1] = await db
        .insert(answerSearches)
        .values({ query: "christmas eve mass time", queryNorm: "christmas eve mass time", resultKind: "card" })
        .returning({ id: answerSearches.id });

      await db.insert(answerFeedback).values([
        {
          cardKey: "mass-times",
          helpful: false,
          query: "christmas eve mass time",
          searchId: s1!.id,
          shown: ["mass-times", "holy-days", "bulletin"],
          position: 1,
          resultCount: 3,
          createdAt: ago(1),
        },
        { cardKey: "mass-times", helpful: false, query: "is there a 5pm saturday", shown: ["mass-times"], position: 1, resultCount: 1, createdAt: ago(2) },
        { cardKey: "mass-times", helpful: true, createdAt: ago(2) },
        { cardKey: "baptism", helpful: false, query: "godparent rules", shown: ["baptism"], position: 1, resultCount: 1, createdAt: ago(3) },
        // A card with only yeses must not appear at all.
        { cardKey: "confession", helpful: true, createdAt: ago(1) },
      ]);
    }

    it("lists only cards with at least one no, worst first", async () => {
      await seedVotes();
      const { getUnhelpfulCards } = await import("@/lib/answers/reports.query");
      const rows = await getUnhelpfulCards(30, 8, 20);
      expect(rows.map((r) => r.cardKey)).toEqual(["mass-times", "baptism"]);
      expect(rows[0]).toMatchObject({ no: 2, yes: 1 });
      expect(rows.map((r) => r.cardKey)).not.toContain("confession");
    });

    it("puts the right searches under the right card", async () => {
      // The window function partitions by card. Get it wrong and every card
      // shows the same list, which looks fine until you read it.
      await seedVotes();
      const { getUnhelpfulCards } = await import("@/lib/answers/reports.query");
      const rows = await getUnhelpfulCards(30, 8, 20);
      const mass = rows.find((r) => r.cardKey === "mass-times")!;
      const baptism = rows.find((r) => r.cardKey === "baptism")!;

      expect(mass.searches.map((s) => s.query)).toEqual([
        "christmas eve mass time",
        "is there a 5pm saturday",
      ]);
      expect(baptism.searches.map((s) => s.query)).toEqual(["godparent rules"]);
    });

    it("reports what else was on screen, minus the card that was marked", async () => {
      await seedVotes();
      const { getUnhelpfulCards } = await import("@/lib/answers/reports.query");
      const rows = await getUnhelpfulCards(30, 8, 20);
      const first = rows[0]!.searches[0]!;
      expect(first.also).toEqual(["holy-days", "bulletin"]);
      expect(first.position).toBe(1);
      expect(first.resultCount).toBe(3);
    });

    it("caps the searches per card without dropping the card", async () => {
      const many = Array.from({ length: 12 }, (_, i) => ({
        cardKey: "mass-times",
        helpful: false,
        query: `try ${i}`,
        createdAt: ago(i + 1),
      }));
      await db.insert(answerFeedback).values(many);
      const { getUnhelpfulCards } = await import("@/lib/answers/reports.query");
      const rows = await getUnhelpfulCards(30, 5, 20);
      expect(rows[0]!.no).toBe(12);
      expect(rows[0]!.searches).toHaveLength(5);
      // Newest first.
      expect(rows[0]!.searches[0]!.query).toBe("try 0");
    });

    it("returns nothing on an empty database rather than throwing", async () => {
      const { getUnhelpfulCards } = await import("@/lib/answers/reports.query");
      expect(await getUnhelpfulCards(30, 8, 20)).toEqual([]);
    });
  });

  describe("getWantedNotes", () => {
    it("returns only rows that actually have a sentence", async () => {
      await db.insert(answerFeedback).values([
        { cardKey: "baptism", helpful: false, wanted: "I wanted the godparent rules", wantedAt: ago(1), createdAt: ago(1) },
        { cardKey: "mass-times", helpful: false, createdAt: ago(1) },
        { cardKey: "grief", helpful: false, wanted: "", createdAt: ago(1) },
      ]);
      const { getWantedNotes } = await import("@/lib/answers/reports.query");
      const rows = await getWantedNotes(180, 20);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.wanted).toBe("I wanted the godparent rules");
    });
  });

  describe("retention", () => {
    it("wipes sentences past 180 days and keeps the rows", async () => {
      await db.insert(answerFeedback).values([
        { cardKey: "a", helpful: false, wanted: "old sentence", wantedAt: ago(200), createdAt: ago(200) },
        { cardKey: "b", helpful: false, wanted: "recent sentence", wantedAt: ago(10), createdAt: ago(10) },
      ]);
      const { pruneAnswerData } = await import("@/lib/answers/retention");
      const result = await pruneAnswerData();

      expect(result.sentencesWiped).toBe(1);
      const rows = await db.select().from(answerFeedback);
      // Both rows survive — the counts are the long-lived part.
      expect(rows).toHaveLength(2);
      const old = rows.find((r) => r.cardKey === "a")!;
      expect(old.wanted).toBeNull();
      // wantedAt stays, so "nobody typed anything" is still distinguishable
      // from "somebody did and it has been cleared".
      expect(old.wantedAt).not.toBeNull();
      expect(rows.find((r) => r.cardKey === "b")!.wanted).toBe("recent sentence");
    });

    it("deletes rows past 400 days", async () => {
      await db.insert(answerSearches).values([
        { query: "ancient", queryNorm: "ancient", resultKind: "none", createdAt: ago(500) },
        { query: "recent", queryNorm: "recent", resultKind: "none", createdAt: ago(10) },
      ]);
      const { pruneAnswerData } = await import("@/lib/answers/retention");
      const result = await pruneAnswerData();
      expect(result.searchesDeleted).toBe(1);
      const rows = await db.select().from(answerSearches);
      expect(rows.map((r) => r.query)).toEqual(["recent"]);
    });

    it("reports overdue sentences so a stalled job is visible", async () => {
      await db.insert(answerFeedback).values({
        cardKey: "a",
        helpful: false,
        wanted: "should have gone",
        wantedAt: ago(200),
        createdAt: ago(200),
      });
      const { getRetentionStatus } = await import("@/lib/answers/retention");
      const status = await getRetentionStatus();
      expect(status.sentencesHeld).toBe(1);
      expect(status.sentencesOverdue).toBe(1);
    });

    it("is safe to run twice", async () => {
      const { pruneAnswerData } = await import("@/lib/answers/retention");
      await pruneAnswerData();
      await expect(pruneAnswerData()).resolves.toMatchObject({
        sentencesWiped: 0,
      });
    });
  });
});
