/**
 * The pure half of the vanity-URL redirect middleware.
 *
 * This logic used to live inline inside the `auth(...)` closure in
 * middleware.ts, where it could not be tested without standing up NextAuth
 * and a NextRequest. It is lifted out verbatim — same order of operations,
 * same string arithmetic, same edge cases — so that the 250-entry redirect
 * manifest ported from WordPress has something guarding it.
 *
 * Wave 18 found that the entire redirect path had been dead since Wave 13.F
 * because of an export-precedence mistake, and nothing failed loudly. The
 * tests around these three functions are the tripwire for a repeat.
 */

export type Redirect = { from: string; to: string; permanent?: boolean };

/**
 * Paths that never get a vanity redirect: Next internals, the API, and the
 * admin (an editor mid-flow should not be 307'd off their own screen).
 *
 * Note this is a bare prefix test, so "/administration" would also be
 * skipped. Deliberate for now — there is no such route — but it is the kind
 * of thing that bites later, so it is pinned by a test.
 */
export function shouldSkipRedirects(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/admin")
  );
}

/**
 * Exact match wins. Otherwise the first prefix rule ("/legacy-section/*") in
 * manifest order catches everything beneath it — there is no longest-prefix
 * preference, so ordering in the admin editor is load-bearing.
 */
export function matchRedirect(
  list: readonly Redirect[],
  pathname: string,
): Redirect | undefined {
  return (
    list.find((r) => r.from === pathname) ??
    list.find(
      (r) => r.from.endsWith("/*") && pathname.startsWith(r.from.slice(0, -1)),
    )
  );
}

/**
 * Resolve the destination path for a matched rule.
 *
 * A "*" in the TARGET substitutes the matched suffix, so
 * "/from-our-pastor/*" → "/blog/*" remaps every legacy permalink to its
 * imported post. Without a "*" in the target, the whole subtree collapses
 * onto the single destination.
 */
export function resolveRedirectTarget(
  match: Redirect,
  pathname: string,
): string {
  if (!match.from.endsWith("/*") || !match.to.includes("*")) return match.to;
  const suffix = pathname.slice(match.from.length - 1).replace(/\/+$/, "");
  return match.to.replace("*", suffix);
}

/** 308 for permanent, 307 otherwise — 307 is the default so a wrong target
 *  never gets memoised by a browser or a search engine. */
export function redirectStatus(match: Redirect): 307 | 308 {
  return match.permanent ? 308 : 307;
}
