/**
 * Loose text normalization for public-facing search boxes.
 *
 * Parish staff search the way they speak — "Art and Environment" for
 * "Art & Environment", "Pre Cana" for "Pre-Cana", "St. Joseph's" for
 * "Saint Joseph's". Both the query and the haystack run through the
 * same normalization so those variants all match:
 *
 *   - case-insensitive
 *   - "&" ⇄ "and"
 *   - "st" / "st." ⇄ "saint"
 *   - hyphens and punctuation (apostrophes, periods, parens) ignored
 */
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['‘’]/g, "") // apostrophes vanish: Joseph's → josephs
    .replace(/[^a-z0-9]+/g, " ") // everything else becomes a space
    .replace(/\bst\b/g, "saint")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when every word of the query appears (as a substring of the
 *  normalized text) — so "gospel gaim" still finds "Sunday Gospel
 *  Alive in Me (GAIM)". */
export function matchesQuery(query: string, ...haystacks: (string | null | undefined)[]): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  const hay = normalizeForSearch(haystacks.filter(Boolean).join(" "));
  return q.split(" ").every((word) => hay.includes(word));
}
