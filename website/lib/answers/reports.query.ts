import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { answerFeedback, answerSearches } from "@/db/schema";

/**
 * The reports that make the feedback worth collecting.
 *
 * The count on its own was never actionable. Five people typing the same
 * thing is a card you are missing; five people typing five different things
 * is a card winning matches it has no business winning. Those are opposite
 * problems and the number five looks identical in both — so every report
 * here carries the searches underneath the count.
 */

export type Period = { days: number };

function since(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

/** Headline numbers for the dashboard. */
export async function getAnswerSummary(days = 30) {
  const from = since(days);

  const [searchRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      cards: sql<number>`count(*) filter (where ${answerSearches.resultKind} = 'card')::int`,
      pages: sql<number>`count(*) filter (where ${answerSearches.resultKind} = 'page')::int`,
      dead: sql<number>`count(*) filter (where ${answerSearches.resultKind} = 'none')::int`,
      clicks: sql<number>`count(*) filter (where ${answerSearches.clicked})::int`,
      distinct: sql<number>`count(distinct ${answerSearches.queryNorm})::int`,
    })
    .from(answerSearches)
    .where(gte(answerSearches.createdAt, from));

  const [voteRow] = await db
    .select({
      yes: sql<number>`count(*) filter (where ${answerFeedback.helpful})::int`,
      no: sql<number>`count(*) filter (where not ${answerFeedback.helpful})::int`,
    })
    .from(answerFeedback)
    .where(gte(answerFeedback.createdAt, from));

  return {
    days,
    total: searchRow?.total ?? 0,
    cards: searchRow?.cards ?? 0,
    pages: searchRow?.pages ?? 0,
    dead: searchRow?.dead ?? 0,
    clicks: searchRow?.clicks ?? 0,
    distinct: searchRow?.distinct ?? 0,
    yes: voteRow?.yes ?? 0,
    no: voteRow?.no ?? 0,
  };
}

/**
 * Everything people searched for and did not find, most common first.
 *
 * This is the to-do list that writes itself — each row is a card somebody
 * wanted and the parish has not written yet.
 */
export async function getDeadEnds(days = 90, limit = 80) {
  return db
    .select({
      query: answerSearches.queryNorm,
      count: sql<number>`count(*)::int`,
      lastSeen: sql<Date>`max(${answerSearches.createdAt})`,
    })
    .from(answerSearches)
    .where(
      and(
        gte(answerSearches.createdAt, since(days)),
        eq(answerSearches.resultKind, "none"),
      ),
    )
    .groupBy(answerSearches.queryNorm)
    .orderBy(sql`count(*) desc`, sql`max(${answerSearches.createdAt}) desc`)
    .limit(limit);
}

export type UnhelpfulCard = {
  cardKey: string;
  no: number;
  yes: number;
  searches: {
    query: string | null;
    also: string[];
    position: number;
    resultCount: number;
    wanted: string | null;
    when: Date;
  }[];
};

/**
 * Cards people marked unhelpful, with the actual searches underneath each
 * one.
 *
 * One query rather than the two-plus-application-fold the WordPress version
 * used — its comment blamed MySQL's handling of per-card subqueries, which
 * does not apply here. A window function takes the newest few per card
 * without loading the ones it is going to throw away.
 */
export async function getUnhelpfulCards(
  days = 30,
  perCard = 8,
  limit = 20,
): Promise<UnhelpfulCard[]> {
  const from = since(days);

  const totals = await db
    .select({
      cardKey: answerFeedback.cardKey,
      no: sql<number>`count(*) filter (where not ${answerFeedback.helpful})::int`,
      yes: sql<number>`count(*) filter (where ${answerFeedback.helpful})::int`,
    })
    .from(answerFeedback)
    .where(gte(answerFeedback.createdAt, from))
    .groupBy(answerFeedback.cardKey)
    .having(sql`count(*) filter (where not ${answerFeedback.helpful}) > 0`)
    .orderBy(sql`count(*) filter (where not ${answerFeedback.helpful}) desc`)
    .limit(limit);

  if (totals.length === 0) return [];

  const keys = totals.map((t) => t.cardKey);

  const ranked = db
    .select({
      cardKey: answerFeedback.cardKey,
      query: answerFeedback.query,
      shown: answerFeedback.shown,
      position: answerFeedback.position,
      resultCount: answerFeedback.resultCount,
      wanted: answerFeedback.wanted,
      createdAt: answerFeedback.createdAt,
      rn: sql<number>`row_number() over (
        partition by ${answerFeedback.cardKey}
        order by ${answerFeedback.createdAt} desc
      )`.as("rn"),
    })
    .from(answerFeedback)
    .where(
      and(
        gte(answerFeedback.createdAt, from),
        eq(answerFeedback.helpful, false),
        // inArray, not a hand-rolled `= any(...)`: passing a JS array into
        // a raw sql template renders it as a tuple, which Postgres rejects.
        inArray(answerFeedback.cardKey, keys),
      ),
    )
    .as("ranked");

  const rows = await db
    .select()
    .from(ranked)
    .where(sql`${ranked.rn} <= ${perCard}`)
    .orderBy(ranked.cardKey, desc(ranked.createdAt));

  const byCard = new Map<string, UnhelpfulCard["searches"]>();
  for (const r of rows) {
    const list = byCard.get(r.cardKey) ?? [];
    list.push({
      query: r.query,
      // What else was on screen when this one failed. A "no" on the only
      // card shown is a content gap; a "no" on the second of three is
      // usually a ranking problem, and the card that should have won is
      // often sitting right here.
      also: (r.shown ?? []).filter((k) => k !== r.cardKey),
      position: r.position,
      resultCount: r.resultCount,
      wanted: r.wanted,
      when: r.createdAt,
    });
    byCard.set(r.cardKey, list);
  }

  return totals.map((t) => ({
    cardKey: t.cardKey,
    no: t.no,
    yes: t.yes,
    searches: byCard.get(t.cardKey) ?? [],
  }));
}

/**
 * The sentences people typed, newest first.
 *
 * One sentence from a real person is worth more than a hundred aggregate
 * rows, and it is the only way to hear about content that does not exist
 * yet. A card cannot fail a search for something nobody ever wrote.
 */
export async function getWantedNotes(days = 180, limit = 60) {
  return db
    .select({
      cardKey: answerFeedback.cardKey,
      query: answerFeedback.query,
      wanted: answerFeedback.wanted,
      createdAt: answerFeedback.createdAt,
    })
    .from(answerFeedback)
    .where(
      and(
        gte(answerFeedback.createdAt, since(days)),
        sql`${answerFeedback.wanted} is not null`,
        sql`${answerFeedback.wanted} <> ''`,
      ),
    )
    .orderBy(desc(answerFeedback.createdAt))
    .limit(limit);
}

/** Most common searches, with how often they led anywhere. */
export async function getTopQueries(days = 30, limit = 40) {
  return db
    .select({
      query: answerSearches.queryNorm,
      count: sql<number>`count(*)::int`,
      clicks: sql<number>`count(*) filter (where ${answerSearches.clicked})::int`,
      dead: sql<number>`count(*) filter (where ${answerSearches.resultKind} = 'none')::int`,
    })
    .from(answerSearches)
    .where(gte(answerSearches.createdAt, since(days)))
    .groupBy(answerSearches.queryNorm)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}
