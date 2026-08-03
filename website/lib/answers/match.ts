import type { CorpusCard, CorpusPage } from "./types";
import {
  MIN_FUZZY_TOKEN_LENGTH,
  MIN_SUBSTRING_LENGTH,
  MIN_TOKEN_LENGTH,
  normalizeQuery,
  tokenize,
} from "./normalize";

/**
 * Matching. Runs in the browser against a corpus shipped with the page, so a
 * search costs nothing and cannot invent an answer. No model runs here.
 *
 * The scoring ladder is the WordPress one, unchanged:
 *
 *   exact trigger match            100
 *   substring, either direction     60
 *   token equals trigger            45
 *   token inside trigger            30
 *   fuzzy, tokens over 4 chars      25
 *
 * A card scores the best of those across all its triggers. Scores never
 * accumulate, so a card's score is always exactly one of
 * {0, 25, 30, 45, 60, 100}. Pages work differently and do accumulate.
 */

/** Levenshtein distance with a length pre-gate. Catches "conformation"
 *  and "bulliten", which are the two misspellings the parish actually gets. */
export function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/**
 * Close enough to be the same word.
 *
 * Argument order matters and is not symmetric: the allowance is derived from
 * `trigger`, not from `token`. Longer triggers tolerate two edits, shorter
 * ones tolerate one. Call it as close(trigger, token).
 */
export function close(trigger: string, token: string): boolean {
  if (Math.abs(trigger.length - token.length) > 2) return false;
  return editDistance(trigger, token) <= (trigger.length > 6 ? 2 : 1);
}

/**
 * Does this token appear in the trigger as a word?
 *
 * FIX: WordPress used a bare `trigger.includes(token)`, which matched
 * anywhere inside any word. So the query "car insurance" scored against
 * "childcare" and "careers", and the parish's childcare card came back for
 * a question about car insurance. A short token inside a longer word is
 * almost always noise.
 *
 * A token counts when it is one of the trigger's words, or when it is at
 * least four characters and a trigger word starts with it — which is what
 * keeps "confess" finding "confession".
 */
export function tokenInTrigger(trigger: string, token: string): boolean {
  const words = trigger.split(" ");
  for (const word of words) {
    if (word === token) return true;
    if (token.length >= MIN_SUBSTRING_LENGTH && word.startsWith(token)) {
      return true;
    }
  }
  return false;
}

export const SCORE = {
  exact: 100,
  substring: 60,
  tokenEqualsTrigger: 45,
  tokenInsideTrigger: 30,
  fuzzy: 25,
} as const;

/** Score one card against an already-normalised needle and its tokens. */
export function scoreCard(
  card: Pick<CorpusCard, "t">,
  needle: string,
  tokens: string[],
): number {
  let best = 0;
  for (const rawTrigger of card.t) {
    const trigger = normalizeQuery(rawTrigger);
    if (!trigger) continue;

    if (trigger === needle) return SCORE.exact;

    // FIX: a minimum length on the substring rung. Without it the query "st"
    // scored 60 against "christmas mass" and buried the real answer.
    if (
      Math.min(trigger.length, needle.length) >= MIN_SUBSTRING_LENGTH &&
      (needle.includes(trigger) || trigger.includes(needle))
    ) {
      best = Math.max(best, SCORE.substring);
    }

    for (const token of tokens) {
      if (token.length < MIN_TOKEN_LENGTH) continue;
      if (trigger === token) {
        best = Math.max(best, SCORE.tokenEqualsTrigger);
      } else if (tokenInTrigger(trigger, token)) {
        best = Math.max(best, SCORE.tokenInsideTrigger);
      } else if (
        token.length >= MIN_FUZZY_TOKEN_LENGTH &&
        close(trigger, token)
      ) {
        best = Math.max(best, SCORE.fuzzy);
      }
    }
  }
  return best;
}

export type ScoredCard<T extends CorpusCard = CorpusCard> = {
  card: T;
  score: number;
};

/**
 * All cards that match, best first. Ties keep corpus order, which is the
 * order the server sent them — so a deliberate ordering in the admin still
 * decides between two equally-good matches.
 */
export function findCards<T extends CorpusCard>(
  cards: readonly T[],
  needle: string,
  tokens: string[],
): ScoredCard<T>[] {
  const hits: ScoredCard<T>[] = [];
  for (const card of cards) {
    const score = scoreCard(card, needle, tokens);
    if (score > 0) hits.push({ card, score });
  }
  // Stable sort — ES2019 guarantees it, and the tie behaviour depends on it.
  return hits.sort((a, b) => b.score - a.score);
}

/**
 * The page fallback for the long tail. Unlike cards this accumulates: a
 * token in the title is worth 4, a token anywhere is worth 1, summed across
 * tokens. No fuzzy matching — a page is a worse answer than a card, so it
 * should not be reached for as eagerly.
 */
export function findPages(
  pages: readonly CorpusPage[],
  tokens: string[],
): CorpusPage[] {
  const useful = tokens.filter((t) => t.length >= MIN_TOKEN_LENGTH);
  if (useful.length === 0) return [];

  const hits: { page: CorpusPage; score: number }[] = [];
  for (const page of pages) {
    const title = normalizeQuery(page.t);
    const hay = `${title} ${normalizeQuery(page.s)}`;
    let score = 0;
    for (const token of useful) {
      if (title.includes(token)) score += 4;
      else if (hay.includes(token)) score += 1;
    }
    if (score > 0) hits.push({ page, score });
  }
  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PAGES)
    .map((h) => h.page);
}

/** Most cards ever rendered, however many matched. */
export const MAX_CARDS_SHOWN = 2;
/** Most pages ever returned by the page search. */
export const MAX_PAGES = 6;
/** Pages shown alongside a single card, as a thin-results backfill. */
export const MAX_PAGES_BESIDE_ONE_CARD = 3;

export type SearchOutcome<T extends CorpusCard = CorpusCard> = {
  /** The cards actually rendered — at most two. */
  cards: T[];
  /** The pages actually rendered. */
  pages: CorpusPage[];
  /** card | page | none, decided by what was rendered. */
  kind: "card" | "page" | "none";
  /** Key of the top card, for the search log. Empty when none matched. */
  topCardKey: string;
  /**
   * How many results were on screen. This is what "shown 2nd of 3" in the
   * feedback report counts against.
   *
   * FIX: WordPress computed this two different ways for the same
   * interaction — the search log used every card that matched, the feedback
   * event used only the ones rendered. A query matching nine cards logged
   * "9 results" while showing two, so the two tables could never be joined
   * honestly. One number now, and it is what the visitor saw.
   */
  shownCount: number;
  /**
   * How many cards matched in total, rendered or not. Kept separately
   * because it answers a different question: a card matching far more
   * searches than it should is the signal that it is winning matches it has
   * no business winning.
   */
  matchCount: number;
};

/**
 * Run a query against cards and pages and decide what goes on screen.
 *
 * Pages are a thin-results backfill, not a second column. With no cards you
 * get up to six pages; with exactly one card you get three below it; with
 * two or more cards you get none, because at that point the cards are
 * answering the question.
 */
export function search<T extends CorpusCard>(
  rawQuery: string,
  cards: readonly T[],
  pages: readonly CorpusPage[],
): SearchOutcome<T> {
  const needle = normalizeQuery(rawQuery);
  const empty: SearchOutcome<T> = {
    cards: [],
    pages: [],
    kind: "none",
    topCardKey: "",
    shownCount: 0,
    matchCount: 0,
  };
  if (!needle) return empty;

  const tokens = tokenize(needle);
  const scored = findCards(cards, needle, tokens);
  const shownCards = scored.slice(0, MAX_CARDS_SHOWN).map((h) => h.card);

  let shownPages: CorpusPage[] = [];
  if (scored.length === 0) {
    shownPages = findPages(pages, tokens);
  } else if (scored.length === 1) {
    shownPages = findPages(pages, tokens).slice(0, MAX_PAGES_BESIDE_ONE_CARD);
  }

  const kind =
    shownCards.length > 0 ? "card" : shownPages.length > 0 ? "page" : "none";

  return {
    cards: shownCards,
    pages: shownPages,
    kind,
    topCardKey: shownCards[0]?.k ?? "",
    shownCount: shownCards.length + shownPages.length,
    matchCount: scored.length,
  };
}
