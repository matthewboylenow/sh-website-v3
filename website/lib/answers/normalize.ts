/**
 * Query and trigger normalisation.
 *
 * The WordPress plugin had two normalisers that disagreed with each other:
 * the browser one (public/js/sha.js) turned hyphens into spaces, the PHP one
 * (class-sha-analytics.php) kept them. That meant the text used for matching
 * and the text stored as `query_norm` for reporting were not the same string,
 * so dead-end counts never quite lined up with what the matcher had seen.
 *
 * There is one normaliser here, used for both. Behaviour follows the browser
 * version, which is the one that decided what people actually saw.
 */

/**
 * Lowercase, fold accents, replace anything that is not a letter, digit,
 * space or apostrophe with a space, collapse whitespace, trim.
 *
 * Replacing with a space rather than nothing is deliberate and load-bearing:
 * "mass/times" becomes "mass times", not "masstimes".
 *
 * No stop words, no stemming, no plural folding. "baptisms" and "baptism"
 * meet on the substring and fuzzy rungs, not here.
 */
export function normalizeQuery(input: unknown): string {
  const raw = typeof input === "string" ? input : String(input ?? "");
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // Curly apostrophes fold to straight ones before the class filter, so
    // "St Helen's" and "St Helen’s" normalise the same. The WordPress
    // version dropped the curly one and split the word.
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a normalised string into its words. */
export function tokenize(normalized: string): string[] {
  return normalized.split(" ").filter(Boolean);
}

/**
 * Shortest query we will act on at all, measured on the raw trimmed input.
 * Below this the widget shows nothing rather than guessing.
 */
export const MIN_QUERY_LENGTH = 2;

/** Shortest token allowed to participate in the token-level score rungs. */
export const MIN_TOKEN_LENGTH = 3;

/** Shortest token allowed to reach the fuzzy rung. */
export const MIN_FUZZY_TOKEN_LENGTH = 5;

/**
 * FIX — shortest string allowed on the substring rung.
 *
 * WordPress had no floor here, and the raw input floor was 2. So the query
 * "st" scored 60 against every trigger containing those two letters —
 * "christmas mass", "first communion", "stations" — and outranked a genuine
 * 45 from a real word match. Two-letter queries returned a near-random top
 * two. Four is the shortest length at which a substring hit means something:
 * it admits "mass", "lent", "ocia".
 */
export const MIN_SUBSTRING_LENGTH = 4;
