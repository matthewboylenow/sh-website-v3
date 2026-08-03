/**
 * Pages that must never be discoverable, even though the URL works.
 *
 * The parish case is the baptism form: Tracey sends it privately after
 * speaking with a family, and it must not turn up in search. Blocking is
 * enforced both when a link is saved and when output is built, so no future
 * card and no bulletin import can reintroduce one, and adding a rule
 * retroactively hides links already stored on existing cards.
 *
 * Ported from class-sha-blocklist.php.
 */

export type BlockRule = {
  url: string;
  reason: string;
  /** `exact` blocks only that URL; `children` also blocks everything under it. */
  match: "exact" | "children";
};

/**
 * Normalise so that scheme, www, host case, trailing slash, query string or
 * fragment cannot be used to slip past the list.
 *
 * FIX, two of them, both real holes in the WordPress version:
 *
 * 1. Query strings and fragments were not stripped, so with a rule on
 *    `/baptism/` the URL `/baptism?src=email` was NOT blocked — it
 *    normalised to a different string that was neither equal to the rule nor
 *    prefixed by it. For a rule whose entire purpose is "must never be
 *    discoverable", that is the whole ballgame.
 * 2. The whole URL was lowercased, path included. On a case-sensitive origin
 *    that silently conflates two different pages. Only the host is
 *    lowercased now.
 */
export function normalizeBlockUrl(url: unknown): string {
  let s = String(url ?? "").trim();
  if (!s) return "";

  s = s.replace(/[?#].*$/, "");
  s = s.replace(/^https?:\/\//i, "");
  s = s.replace(/^www\./i, "");
  s = s.replace(/\/+$/, "");

  const slash = s.indexOf("/");
  if (slash === -1) return s.toLowerCase();
  return s.slice(0, slash).toLowerCase() + s.slice(slash);
}

/** Is this URL on the blocklist? */
export function isBlocked(rules: readonly BlockRule[], url: unknown): boolean {
  const target = normalizeBlockUrl(url);
  if (!target) return false;

  for (const rule of rules) {
    const blocked = normalizeBlockUrl(rule.url);
    if (!blocked) continue;
    if (target === blocked) return true;
    // The separating slash matters: a rule on /baptism/ must not catch
    // /baptism-forms/.
    if (rule.match === "children" && target.startsWith(`${blocked}/`)) {
      return true;
    }
  }
  return false;
}

/** Drop every blocked link from a list. Used at save and at render. */
export function filterLinks<T extends { url: string }>(
  rules: readonly BlockRule[],
  links: readonly T[],
): T[] {
  return links.filter((l) => l.url !== "" && !isBlocked(rules, l.url));
}
