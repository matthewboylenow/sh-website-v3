import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "./auth.config";
import { db } from "./db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "./db/schema";
import { sendMagicLink } from "./lib/email";
import { checkSmsCode, normalizePhone } from "./lib/sms";

/**
 * Full Auth.js setup — Node runtime only (the Drizzle adapter and the
 * Twilio/Resend SDKs aren't edge-safe). Imported by route handlers,
 * Server Actions, and any page that needs `auth()`. Middleware uses
 * `auth.config.ts` directly to stay edge-friendly.
 */

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  // The Drizzle adapter writes verification tokens, accounts, and the
  // initial user row even though sessions themselves are JWT.
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    /* ---- Magic-link email -------------------------------------- */
    {
      id: "email",
      type: "email",
      name: "Email",
      from: process.env.EMAIL_FROM ?? "Saint Helen <no-reply@send.sainthelen.org>",
      maxAge: 24 * 60 * 60, // link expires in 24h
      server: {},
      options: {},
      async sendVerificationRequest({ identifier, url }) {
        await sendMagicLink(identifier, url);
      },
    },
    /* ---- Two-step SMS via Twilio Verify ------------------------ */
    Credentials({
      id: "sms",
      name: "Phone",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const phoneInput = String(credentials?.phone ?? "").trim();
        const code = String(credentials?.code ?? "").trim();
        const phone = normalizePhone(phoneInput);
        if (!phone || !code) return null;

        const verified = await checkSmsCode(phone, code);
        if (!verified) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.phone, phone))
          .limit(1);
        // SMS sign-in is invitation-only — no account auto-creation.
        // (See backend.html §07: "If someone loses access to both email
        // and phone, an admin re-issues their account.")
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          ministryId: user.ministryId,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Hydrate `role` and `ministryId` from the DB the first time we
    // mint a JWT. Auth.js calls jwt() with `user` populated only on
    // initial sign-in (after authorize/sendVerificationRequest).
    async jwt(args) {
      const { token } = args;
      const baseRun = await authConfig.callbacks?.jwt?.(args);
      const merged = baseRun ?? token;

      // For email-link sign-in, `user` is the DB row but `role` /
      // `ministryId` columns aren't auto-mapped. Read them.
      if (args.user && (!merged.role || !merged.userId)) {
        const userId = (args.user as { id?: string }).id;
        if (userId) {
          const [u] = await db
            .select({
              id: users.id,
              role: users.role,
              ministryId: users.ministryId,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          if (u) {
            merged.userId = u.id;
            merged.role = u.role;
            merged.ministryId = u.ministryId;
          }
        }
      }
      return merged;
    },
  },
});
