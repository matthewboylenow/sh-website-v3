import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

/**
 * Edge middleware. Order:
 *   1. Vanity-URL redirects from siteSettings (admin-managed).
 *   2. Auth.js authorized callback in auth.config (gates /admin/*).
 *
 * Redirects fetched via Next's data-cached fetch — matches the
 * /api/redirects route's revalidateTag("redirects") bust, so the hot
 * path is one in-memory cache hit per request after warmup.
 */

type Redirect = { from: string; to: string; permanent?: boolean };

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

  // Skip vanity-redirect lookup for Next internals, the API, and admin
  // routes (admins shouldn't 307 mid-flow on their own paths).
  const skipRedirects =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/admin");

  if (!skipRedirects) {
    const list = await getRedirects(req.url);
    // Exact match wins; otherwise a prefix rule ("/legacy-section/*")
    // catches every path under it — used for retired WP sections whose
    // children all map to one destination (e.g. /stewardship-spotlight/*).
    const match =
      list.find((r) => r.from === pathname) ??
      list.find(
        (r) =>
          r.from.endsWith("/*") &&
          pathname.startsWith(r.from.slice(0, -1)),
      );
    if (match) {
      const target = new URL(match.to, req.url);
      const status = match.permanent ? 308 : 307;
      return NextResponse.redirect(target, status);
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
