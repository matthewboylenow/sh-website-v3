import { createHmac, timingSafeEqual } from "node:crypto";
import { parishDateString } from "@/lib/timezone";

/**
 * Visitor identity for the answer engine — enough to rate limit and to stop
 * one person overwriting another's words, and no more than that.
 *
 * No address is ever stored. What goes into the hash is the address, the
 * user agent and the day, run through an HMAC keyed on the app secret, and
 * only the digest is written.
 */

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    // Failing loudly beats silently hashing everything with an empty key,
    // which would make every visitor look like the same person.
    throw new Error("AUTH_SECRET is required to hash answer-engine sessions.");
  }
  return s;
}

/**
 * The parish's own day, not UTC.
 *
 * The WordPress version rotated this at UTC midnight, which is 7pm or 8pm in
 * Westfield. A visitor who left a "no" at 7:59pm and typed their sentence at
 * 8:01pm had it silently dropped — the row's stored hash no longer matched
 * the one the server derived — while the screen still said thank you. A
 * nightly hour of invisible data loss.
 */
export function parishDay(now: Date = new Date()): string {
  return parishDateString(now);
}

/** Derive the daily visitor hash. Rotates at parish midnight. */
export function sessionHash(
  ip: string | null,
  userAgent: string | null,
  now: Date = new Date(),
): string {
  return createHmac("sha256", secret())
    .update(`${ip ?? ""}|${userAgent ?? ""}|${parishDay(now)}`)
    .digest("hex")
    .slice(0, 32);
}

/** Pull the client address out of the proxy headers Vercel sets. */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip");
}

/**
 * A short-lived signed token proving the bearer is the visitor who left a
 * particular piece of feedback.
 *
 * This is what lets somebody fill in "what were you looking for?" a minute
 * later without the server re-deriving their identity from address and
 * agent. It survives parish midnight, and it survives a phone handing over
 * from wifi to cellular mid-sentence — both of which silently ate the
 * WordPress version's follow-up.
 */
const TOKEN_TTL_MS = 30 * 60 * 1000;

export function signFeedbackToken(
  feedbackId: string,
  now: Date = new Date(),
): string {
  const expires = now.getTime() + TOKEN_TTL_MS;
  const payload = `${feedbackId}.${expires}`;
  const mac = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

/** Returns the feedback id when the token is valid and unexpired. */
export function verifyFeedbackToken(
  token: unknown,
  now: Date = new Date(),
): string | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [feedbackId, expiresRaw, mac] = parts as [string, string, string];

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < now.getTime()) return null;

  const expected = createHmac("sha256", secret())
    .update(`${feedbackId}.${expiresRaw}`)
    .digest("hex");
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;

  return feedbackId;
}
