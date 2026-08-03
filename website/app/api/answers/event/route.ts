import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { answerFeedback, answerSearches } from "@/db/schema";
import { normalizeQuery } from "@/lib/answers/normalize";
import { consumeRateLimit } from "@/lib/answers/rate-limit";
import { scrubFreeText, scrubQuery } from "@/lib/answers/scrub";
import {
  clientIp,
  sessionHash,
  signFeedbackToken,
  verifyFeedbackToken,
} from "@/lib/answers/session";

/**
 * Everything the search widget writes: a search, a click, a yes or no, and
 * the sentence somebody types after a no.
 *
 * Four things this endpoint takes seriously, because a parish is exactly
 * where somebody types something they would not want kept:
 *
 *   - the raw search term is scrubbed of contact details before storage,
 *     not only the free text (WordPress kept search terms in the clear for
 *     400 days);
 *   - the free text can be written once, by the visitor who left the no,
 *     proven with a signed token rather than a re-derived address hash;
 *   - a click can only be attributed by the visitor who made the search;
 *   - everything is rate limited on one shared allowance.
 */

export const runtime = "nodejs";

const SearchEvent = z.object({
  type: z.literal("search"),
  query: z.string().min(1).max(400),
  kind: z.enum(["card", "page", "none"]),
  card: z.string().max(80).optional().default(""),
  shownCount: z.number().int().min(0).max(500).optional().default(0),
  matchCount: z.number().int().min(0).max(500).optional().default(0),
  source: z.string().max(40).optional().default("widget"),
});

const ClickEvent = z.object({
  type: z.literal("click"),
  searchId: z.uuid(),
  url: z.string().min(1).max(1000),
});

const FeedbackEvent = z.object({
  type: z.literal("feedback"),
  card: z.string().min(1).max(80),
  helpful: z.boolean(),
  query: z.string().max(400).optional().default(""),
  searchId: z.uuid().nullish(),
  shown: z.array(z.string().max(80)).max(10).optional().default([]),
  position: z.number().int().min(0).max(255).optional().default(0),
  resultCount: z.number().int().min(0).max(500).optional().default(0),
});

const WantedEvent = z.object({
  type: z.literal("wanted"),
  token: z.string().min(1).max(400),
  text: z.string().min(1).max(1000),
});

const Body = z.discriminatedUnion("type", [
  SearchEvent,
  ClickEvent,
  FeedbackEvent,
  WantedEvent,
]);

/** Nothing here is worth a detailed error. Quiet and uniform. */
const ok = (extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...extra });
const no = (status = 400) => NextResponse.json({ ok: false }, { status });

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return no();
  }
  if (!parsed.success) return no();
  const event = parsed.data;

  const hash = sessionHash(
    clientIp(req.headers),
    req.headers.get("user-agent"),
  );

  const rate = await consumeRateLimit(hash);
  if (!rate.ok) return no(429);

  switch (event.type) {
    case "search": {
      const query = scrubQuery(event.query);
      if (!query) return no();
      const [row] = await db
        .insert(answerSearches)
        .values({
          query,
          queryNorm: normalizeQuery(query).slice(0, 190),
          resultKind: event.kind,
          cardKey: event.card || null,
          resultCount: event.shownCount,
          matchCount: event.matchCount,
          sessionHash: hash,
          source: event.source.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "widget",
        })
        .returning({ id: answerSearches.id });
      return ok({ searchId: row?.id ?? null });
    }

    case "click": {
      // Scoped to the visitor who made the search. WordPress updated on id
      // alone, so anyone could mark any search as clicked and write an
      // arbitrary URL into it — which the admin then displayed.
      const updated = await db
        .update(answerSearches)
        .set({ clicked: true, clickedUrl: event.url.slice(0, 1000) })
        .where(
          and(
            eq(answerSearches.id, event.searchId),
            eq(answerSearches.sessionHash, hash),
          ),
        )
        .returning({ id: answerSearches.id });
      return ok({ recorded: updated.length === 1 });
    }

    case "feedback": {
      try {
        const [row] = await db
          .insert(answerFeedback)
          .values({
            cardKey: event.card,
            helpful: event.helpful,
            query: scrubQuery(event.query) || null,
            searchId: event.searchId ?? null,
            shown: event.shown.slice(0, 10),
            position: event.position,
            resultCount: event.resultCount,
            sessionHash: hash,
          })
          .returning({ id: answerFeedback.id });
        if (!row) return no();
        // Only a "no" earns a follow-up. A yes ends here.
        return ok({
          feedbackToken: event.helpful ? null : signFeedbackToken(row.id),
        });
      } catch (err) {
        // The unique index means a second vote on the same card for the
        // same search lands here. That is the guard working, not an error
        // worth surfacing.
        const constraint = (err as { cause?: { constraint?: string } }).cause
          ?.constraint;
        if (constraint === "answer_feedback_once_uq") return ok({ feedbackToken: null });
        throw err;
      }
    }

    case "wanted": {
      const feedbackId = verifyFeedbackToken(event.token);
      if (!feedbackId) return no(403);

      const text = scrubFreeText(event.text);
      if (!text) return no();

      // Fills a blank and only a blank. A second submission matches no rows.
      const updated = await db
        .update(answerFeedback)
        .set({ wanted: text, wantedAt: sql`now()` })
        .where(
          and(
            eq(answerFeedback.id, feedbackId),
            isNull(answerFeedback.wanted),
          ),
        )
        .returning({ id: answerFeedback.id });
      return ok({ recorded: updated.length === 1 });
    }
  }
}
