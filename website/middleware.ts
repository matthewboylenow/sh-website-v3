import NextAuth from "next-auth";
import authConfig from "./auth.config";

/**
 * Edge middleware. Uses the slim `auth.config.ts` (no DB / no
 * Twilio / no Resend) so it runs in the Edge runtime. The
 * `authorized` callback in auth.config.ts redirects unauthenticated
 * /admin/* requests to /sign-in.
 */
export const { auth: middleware } = NextAuth(authConfig);

export default middleware(() => {
  // The authorized callback in auth.config.ts has already decided
  // whether to allow / redirect. Nothing else to do here.
  return undefined;
});

export const config = {
  // Run on every route except Next internals, public files, and API
  // routes that should never be gated (auth, public site routes).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)).*)"],
};
