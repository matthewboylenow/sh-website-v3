import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe portion of the Auth.js config. Imported by middleware.ts
 * (which can't reach the DB or Node-only Twilio/Resend clients).
 *
 * Providers are added in `auth.ts` because they touch the DB. Here we
 * only declare callbacks, page paths, and session strategy.
 */
export default {
  pages: { signIn: "/sign-in" },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Auth.js v5 calls this on every request that goes through middleware.
  // Returning false redirects to `pages.signIn`.
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const onAdmin = nextUrl.pathname.startsWith("/admin");
      const onSignIn = nextUrl.pathname.startsWith("/sign-in");

      if (onAdmin && !isLoggedIn) return false;

      if (onSignIn && isLoggedIn) {
        return Response.redirect(new URL("/admin", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      // user is populated on initial sign-in; copy over the role claim.
      // ministryIds is hydrated from the DB in auth.ts's jwt callback
      // since auth.config.ts (this file) is edge-safe and DB-less.
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: string }).role ?? "editor";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? session.user.id;
        session.user.role = (token.role as Role) ?? "editor";
        session.user.ministryIds = (token.ministryIds as string[]) ?? [];
      }
      return session;
    },
  },
  // Providers list is filled in `auth.ts`. Empty here is fine — the edge
  // middleware only uses the callbacks above to validate the session JWT.
  providers: [],
} satisfies NextAuthConfig;

export type Role = "admin" | "editor" | "ministry_lead";
