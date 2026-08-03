import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import seedJson from "@/db/seed/data/answer-cards.json";
import { seedCardsFromJson } from "@/db/seed/answer-cards";
import {
  answerCards,
  answerFeedback,
  answerSearches,
} from "@/db/schema";

/**
 * The parts of the answer engine that only Postgres can confirm: that the
 * 52 cards round-trip through jsonb unchanged, that the unique key really
 * stops a duplicate Mass-times card, and that a visitor cannot vote twice on
 * the same card for the same search.
 *
 * Skips silently unless TEST_DATABASE_URL is set — CI has no Postgres.
 */

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite("the answer engine against Postgres", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    db = drizzle(pool);
    await db.delete(answerFeedback);
    await db.delete(answerSearches);
    await db.delete(answerCards);
  });

  afterAll(async () => {
    await db.delete(answerFeedback);
    await db.delete(answerSearches);
    await db.delete(answerCards);
    await pool.end();
  });

  const seeded = seedCardsFromJson(seedJson.cards as never);

  it("seeds all 52 cards", async () => {
    await db.insert(answerCards).values(
      seeded.map((c) => ({
        key: c.key,
        title: c.title,
        answer: c.answer,
        group: c.group,
        triggers: c.triggers,
        links: c.links,
        moments: c.moments,
        contact: c.contact,
        pastoral: c.pastoral,
        activation: c.activation,
        status: c.status,
        note: c.note,
        source: c.source,
        position: c.position,
      })),
    );
    const rows = await db.select().from(answerCards);
    expect(rows).toHaveLength(52);
  });

  it("round-trips the jsonb columns byte for byte", async () => {
    for (const expected of seeded) {
      const [row] = await db
        .select()
        .from(answerCards)
        .where(eq(answerCards.key, expected.key));
      expect(row, expected.key).toBeDefined();
      expect(row!.triggers, `${expected.key} triggers`).toEqual(expected.triggers);
      expect(row!.links, `${expected.key} links`).toEqual(expected.links);
      expect(row!.moments, `${expected.key} moments`).toEqual(expected.moments);
      expect(row!.activation, `${expected.key} activation`).toEqual(
        expected.activation,
      );
    }
  });

  it("holds the ten pastoral cards in review", async () => {
    const rows = await db
      .select()
      .from(answerCards)
      .where(eq(answerCards.status, "review"));
    expect(rows).toHaveLength(10);
    expect(rows.every((r) => r.pastoral)).toBe(true);
  });

  /** Drizzle wraps driver errors, so the constraint name is on the cause. */
  const violatedConstraint = async (run: () => Promise<unknown>) => {
    try {
      await run();
    } catch (err) {
      const cause = (err as { cause?: { constraint?: string } }).cause;
      return cause?.constraint ?? String(err);
    }
    return null;
  };

  it("refuses a second card with the same key", async () => {
    // WordPress resolved this by taking whichever row came back first, which
    // for a Mass time is not good enough.
    expect(
      await violatedConstraint(() =>
        db.insert(answerCards).values({
          key: "mass-times",
          title: "Duplicate",
          answer: "Wrong times.",
        }),
      ),
    ).toBe("answer_cards_key_uq");
  });

  it("stores a search and links feedback back to it", async () => {
    const [s] = await db
      .insert(answerSearches)
      .values({
        query: "christmas eve mass time",
        queryNorm: "christmas eve mass time",
        resultKind: "card",
        cardKey: "mass-times",
        resultCount: 3,
        matchCount: 5,
        sessionHash: "hash-a",
      })
      .returning({ id: answerSearches.id });

    const [f] = await db
      .insert(answerFeedback)
      .values({
        cardKey: "mass-times",
        helpful: false,
        query: "christmas eve mass time",
        searchId: s!.id,
        shown: ["mass-times", "holy-days", "bulletin"],
        position: 1,
        resultCount: 3,
        sessionHash: "hash-a",
      })
      .returning({ id: answerFeedback.id });

    const [row] = await db
      .select()
      .from(answerFeedback)
      .where(eq(answerFeedback.id, f!.id));
    expect(row!.shown).toEqual(["mass-times", "holy-days", "bulletin"]);
    expect(row!.searchId).toBe(s!.id);
    expect(row!.position).toBe(1);
  });

  it("allows one vote per card per search and no more", async () => {
    const [s] = await db
      .insert(answerSearches)
      .values({
        query: "confession",
        queryNorm: "confession",
        resultKind: "card",
        sessionHash: "hash-b",
      })
      .returning({ id: answerSearches.id });

    await db.insert(answerFeedback).values({
      cardKey: "confession",
      helpful: true,
      searchId: s!.id,
      sessionHash: "hash-b",
    });

    expect(
      await violatedConstraint(() =>
        db.insert(answerFeedback).values({
          cardKey: "confession",
          helpful: false,
          searchId: s!.id,
          sessionHash: "hash-b",
        }),
      ),
    ).toBe("answer_feedback_once_uq");
  });

  it("lets the same visitor vote again after a fresh search", async () => {
    const [s2] = await db
      .insert(answerSearches)
      .values({
        query: "confession times",
        queryNorm: "confession times",
        resultKind: "card",
        sessionHash: "hash-b",
      })
      .returning({ id: answerSearches.id });

    await expect(
      db.insert(answerFeedback).values({
        cardKey: "confession",
        helpful: false,
        searchId: s2!.id,
        sessionHash: "hash-b",
      }),
    ).resolves.toBeDefined();
  });

  it("fills the free text once and only by the visitor who left the no", async () => {
    const [f] = await db
      .insert(answerFeedback)
      .values({
        cardKey: "baptism",
        helpful: false,
        sessionHash: "hash-c",
      })
      .returning({ id: answerFeedback.id });

    const fill = (hash: string, text: string) =>
      db
        .update(answerFeedback)
        .set({ wanted: text, wantedAt: new Date() })
        .where(
          sql`${answerFeedback.id} = ${f!.id}
              AND ${answerFeedback.sessionHash} = ${hash}
              AND ${answerFeedback.wanted} IS NULL`,
        )
        .returning({ id: answerFeedback.id });

    // Somebody else guessing the id gets nothing.
    expect(await fill("hash-intruder", "not theirs")).toHaveLength(0);

    // The visitor who left the no writes once.
    expect(await fill("hash-c", "I wanted the godparent rules")).toHaveLength(1);

    // And cannot overwrite it afterwards.
    expect(await fill("hash-c", "second thoughts")).toHaveLength(0);

    const [row] = await db
      .select()
      .from(answerFeedback)
      .where(eq(answerFeedback.id, f!.id));
    expect(row!.wanted).toBe("I wanted the godparent rules");
  });

  it("keeps feedback when its search row is pruned", async () => {
    // Both tables prune on the same clock, and a feedback row is always
    // created at or after its search row, so the search goes first. The
    // vote itself must survive that — the counts are the long-lived part.
    const [s] = await db
      .insert(answerSearches)
      .values({
        query: "parking",
        queryNorm: "parking",
        resultKind: "none",
        sessionHash: "hash-d",
      })
      .returning({ id: answerSearches.id });

    const [f] = await db
      .insert(answerFeedback)
      .values({ cardKey: "parking", helpful: false, searchId: s!.id })
      .returning({ id: answerFeedback.id });

    await db.delete(answerSearches).where(eq(answerSearches.id, s!.id));

    const [row] = await db
      .select()
      .from(answerFeedback)
      .where(eq(answerFeedback.id, f!.id));
    expect(row).toBeDefined();
    expect(row!.searchId).toBeNull();
  });
});
