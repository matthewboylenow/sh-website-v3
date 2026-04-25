import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * One-shot magic-link tokens embedded in lead-notification emails so a
 * lead can click "Contacted / Joined / Stuck" without signing in.
 *
 * Tokens are HMAC-SHA256 signed with AUTH_SECRET and expire in 24 hours.
 * The action endpoint additionally verifies the inquiry hasn't already
 * advanced past the action — so a re-click is idempotent.
 */

export type InquiryAction = "contacted" | "joined" | "stuck";

const TTL_MS = 24 * 60 * 60 * 1000;

type Payload = {
  /** Inquiry id */
  iid: string;
  /** Action */
  act: InquiryAction;
  /** Expiry, unix ms */
  exp: number;
};

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set — required to sign inquiry tokens");
  return s;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(payloadB64: string): string {
  return b64urlEncode(createHmac("sha256", secret()).update(payloadB64).digest());
}

export function signInquiryToken(inquiryId: string, action: InquiryAction): string {
  const payload: Payload = {
    iid: inquiryId,
    act: action,
    exp: Date.now() + TTL_MS,
  };
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export type VerifyResult =
  | { ok: true; inquiryId: string; action: InquiryAction }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

export function verifyInquiryToken(token: string): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [body, sig] = parts as [string, string];

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad-signature" };
  }

  let payload: Payload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8")) as Payload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (
    typeof payload.iid !== "string" ||
    (payload.act !== "contacted" && payload.act !== "joined" && payload.act !== "stuck")
  ) {
    return { ok: false, reason: "malformed" };
  }

  return { ok: true, inquiryId: payload.iid, action: payload.act };
}
