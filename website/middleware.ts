import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";
import {
  matchRedirect,
  redirectStatus,
  resolveRedirectTarget,
  shouldSkipRedirects,
  type Redirect,
} from "./lib/redirect-match";

/**
 * Edge middleware. Order:
 *   1. Vanity-URL redirects from siteSettings (admin-managed).
 *   2. Auth.js authorized callback in auth.config (gates /admin/*).
 *
 * Redirects fetched via Next's data-cached fetch — matches the
 * /api/redirects route's revalidateTag("redirects") bust, so the hot
 * path is one in-memory cache hit per request after warmup.
 */

async function getRedirects(reqUrl: string): Promise<Redirect[]> {
  try {
    const r = await fetch(new URL("/api/redirects", reqUrl), {
      next: { tags: ["redirects"], revalidate: 300 },
    });
    if (!r.ok) return [];
    const data = (await r.json()) as { items?: Redirect[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

// NOTE: this must NOT be exported as `middleware` — Next prefers a named
// `middleware` export over the default export, and a bare `auth` export
// here silently replaced the wrapped handler below (vanity redirects never
// ran). Keep `auth` module-private and default-export the wrapped handler.
const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname;

  // Matching logic lives in lib/redirect-match.ts so it can be unit tested
  // without NextAuth or a NextRequest. Behaviour is unchanged.
  if (!shouldSkipRedirects(pathname)) {
    const list = await getRedirects(req.url);
    const match = matchRedirect(list, pathname);
    if (match) {
      const target = new URL(resolveRedirectTarget(match, pathname), req.url);
      return NextResponse.redirect(target, redirectStatus(match));
    }
  }

  // Fall through to auth.config's authorized callback.
  return undefined;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)).*)",
  ],
};
