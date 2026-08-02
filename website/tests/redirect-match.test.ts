import { describe, expect, it } from "vitest";
import {
  matchRedirect,
  redirectStatus,
  resolveRedirectTarget,
  shouldSkipRedirects,
  type Redirect,
} from "@/lib/redirect-match";

/**
 * 250 redirect rules stand between the old sainthelen.org URLs — in Google,
 * in bulletins, in ten years of emails — and a 404. Wave 18 found the whole
 * path had been silently dead since Wave 13.F. These are the tripwires.
 */

const manifest: Redirect[] = [
  { from: "/adoration", to: "/eucharistic-adoration", permanent: true },
  { from: "/from-our-pastor/*", to: "/blog/*", permanent: true },
  { from: "/parish-life/*", to: "/ministries", permanent: false },
  { from: "/give-now", to: "/give" },
];

describe("shouldSkipRedirects", () => {
  it("skips Next internals", () => {
    expect(shouldSkipRedirects("/_next/static/chunk.js")).toBe(true);
  });

  it("skips the API", () => {
    expect(shouldSkipRedirects("/api/redirects")).toBe(true);
  });

  it("skips the admin so an editor is never bounced mid-flow", () => {
    expect(shouldSkipRedirects("/admin")).toBe(true);
    expect(shouldSkipRedirects("/admin/events/new")).toBe(true);
  });

  it("does not skip ordinary public paths", () => {
    expect(shouldSkipRedirects("/")).toBe(false);
    expect(shouldSkipRedirects("/mass")).toBe(false);
    expect(shouldSkipRedirects("/adoration")).toBe(false);
  });

  it("pins the bare-prefix quirk on /admin", () => {
    // "/administration" is not an admin route but is skipped anyway,
    // because the check is startsWith("/admin") not startsWith("/admin/").
    // Harmless today. Change it deliberately, not by accident.
    expect(shouldSkipRedirects("/administration")).toBe(true);
    expect(shouldSkipRedirects("/apixel")).toBe(false);
  });
});

describe("matchRedirect", () => {
  it("finds an exact match", () => {
    expect(matchRedirect(manifest, "/adoration")?.to).toBe(
      "/eucharistic-adoration",
    );
  });

  it("returns undefined when nothing matches", () => {
    expect(matchRedirect(manifest, "/nothing-here")).toBeUndefined();
  });

  it("finds a prefix match", () => {
    expect(matchRedirect(manifest, "/from-our-pastor/lent-2024")?.to).toBe(
      "/blog/*",
    );
  });

  it("prefers an exact match over a prefix rule regardless of order", () => {
    const list: Redirect[] = [
      { from: "/parish-life/*", to: "/ministries" },
      { from: "/parish-life/knights", to: "/ministries/knights-of-columbus" },
    ];
    expect(matchRedirect(list, "/parish-life/knights")?.to).toBe(
      "/ministries/knights-of-columbus",
    );
  });

  it("takes the first prefix rule in manifest order, not the longest", () => {
    // No longest-prefix preference. Ordering in the admin editor decides.
    const list: Redirect[] = [
      { from: "/a/*", to: "/broad" },
      { from: "/a/b/*", to: "/narrow" },
    ];
    expect(matchRedirect(list, "/a/b/c")?.to).toBe("/broad");
  });

  it("requires the separating slash before matching a prefix", () => {
    expect(matchRedirect(manifest, "/from-our-pastorate")).toBeUndefined();
  });

  it("matches the prefix root itself", () => {
    expect(matchRedirect(manifest, "/from-our-pastor/")?.to).toBe("/blog/*");
  });

  it("does not match the prefix root without its trailing slash", () => {
    // "/from-our-pastor" needs its own exact rule. Worth knowing when a
    // legacy section index page 404s while everything under it works.
    expect(matchRedirect(manifest, "/from-our-pastor")).toBeUndefined();
  });

  it("is case sensitive", () => {
    expect(matchRedirect(manifest, "/Adoration")).toBeUndefined();
  });

  it("handles an empty manifest without throwing", () => {
    expect(matchRedirect([], "/adoration")).toBeUndefined();
  });
});

describe("resolveRedirectTarget", () => {
  it("substitutes the matched suffix when the target has a wildcard", () => {
    const match = manifest[1]!;
    expect(resolveRedirectTarget(match, "/from-our-pastor/lent-2024")).toBe(
      "/blog/lent-2024",
    );
  });

  it("keeps nested suffixes intact", () => {
    const match = manifest[1]!;
    expect(
      resolveRedirectTarget(match, "/from-our-pastor/2024/03/lent"),
    ).toBe("/blog/2024/03/lent");
  });

  it("strips a trailing slash from the substituted suffix", () => {
    const match = manifest[1]!;
    expect(resolveRedirectTarget(match, "/from-our-pastor/lent-2024/")).toBe(
      "/blog/lent-2024",
    );
  });

  it("collapses a whole subtree when the target has no wildcard", () => {
    const match = manifest[2]!;
    expect(resolveRedirectTarget(match, "/parish-life/anything/at/all")).toBe(
      "/ministries",
    );
  });

  it("leaves an exact-match target alone", () => {
    expect(resolveRedirectTarget(manifest[0]!, "/adoration")).toBe(
      "/eucharistic-adoration",
    );
  });

  it("yields the bare target when the prefix root is hit", () => {
    expect(resolveRedirectTarget(manifest[1]!, "/from-our-pastor/")).toBe(
      "/blog/",
    );
  });

  it("supports an absolute off-site target", () => {
    const match: Redirect = {
      from: "/give-online",
      to: "https://sainthelen.tpsdb.com/give",
    };
    expect(resolveRedirectTarget(match, "/give-online")).toBe(
      "https://sainthelen.tpsdb.com/give",
    );
  });
});

describe("redirectStatus", () => {
  it("uses 308 for permanent rules", () => {
    expect(redirectStatus({ from: "/a", to: "/b", permanent: true })).toBe(308);
  });

  it("defaults to 307 so a wrong target is never memoised", () => {
    expect(redirectStatus({ from: "/a", to: "/b" })).toBe(307);
    expect(redirectStatus({ from: "/a", to: "/b", permanent: false })).toBe(307);
  });
});

describe("end to end through the manifest", () => {
  const resolve = (pathname: string) => {
    if (shouldSkipRedirects(pathname)) return null;
    const match = matchRedirect(manifest, pathname);
    if (!match) return null;
    return {
      to: resolveRedirectTarget(match, pathname),
      status: redirectStatus(match),
    };
  };

  it("routes a legacy pastor permalink to its imported post", () => {
    expect(resolve("/from-our-pastor/a-word-for-advent")).toEqual({
      to: "/blog/a-word-for-advent",
      status: 308,
    });
  });

  it("routes a standalone vanity URL", () => {
    expect(resolve("/adoration")).toEqual({
      to: "/eucharistic-adoration",
      status: 308,
    });
  });

  it("routes a temporary rule with 307", () => {
    expect(resolve("/give-now")).toEqual({ to: "/give", status: 307 });
  });

  it("leaves live routes alone", () => {
    expect(resolve("/mass")).toBeNull();
    expect(resolve("/events/parish-picnic")).toBeNull();
  });

  it("never redirects the admin, even when a rule would match", () => {
    const shadowing: Redirect[] = [{ from: "/admin/events", to: "/events" }];
    expect(shouldSkipRedirects("/admin/events")).toBe(true);
    expect(matchRedirect(shadowing, "/admin/events")).toBeDefined();
  });
});
