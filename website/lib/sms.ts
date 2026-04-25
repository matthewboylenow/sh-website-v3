/**
 * Twilio Verify wrappers. Production path uses Twilio Verify v2
 * (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_VERIFY_SERVICE_SID).
 *
 * Dev fallback: when the Twilio creds are missing, `sendSmsCode` logs
 * a placeholder code to the server console and `checkSmsCode` accepts
 * the literal value DEV_SMS_CODE ("123456"). Lets us build the admin
 * locally before Matthew provisions Twilio.
 *
 * Twilio Verify also rate-limits per number on its end — we add a
 * lightweight per-phone in-memory cap on top to avoid surprise bills
 * if creds leak. (For a real prod cap use a durable store; in-memory
 * is fine for a serverless deployment that scales to zero.)
 */

const DEV_SMS_CODE = "123456";

const recentSends = new Map<string, number[]>(); // phone → timestamps
const PER_PHONE_LIMIT = 5;
const PER_PHONE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Normalize a user-entered phone string into E.164. Accepts shapes
 * parishioners might type:
 *   "9085551234"     → "+19085551234"   (10-digit US)
 *   "(908) 555-1234" → "+19085551234"
 *   "19085551234"    → "+19085551234"
 *   "+19085551234"   → "+19085551234"   (already E.164 — unchanged)
 *
 * Returns null when the input can't be coerced.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D+/g, "");
  if (digits.length < 7) return null;
  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`; // US default
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function rateLimit(phone: string): boolean {
  const now = Date.now();
  const cutoff = now - PER_PHONE_WINDOW_MS;
  const stamps = (recentSends.get(phone) ?? []).filter((t) => t > cutoff);
  if (stamps.length >= PER_PHONE_LIMIT) {
    recentSends.set(phone, stamps);
    return false;
  }
  stamps.push(now);
  recentSends.set(phone, stamps);
  return true;
}

function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID,
  );
}

export async function sendSmsCode(phone: string): Promise<{ ok: boolean; error?: string }> {
  if (!rateLimit(phone)) {
    return { ok: false, error: "Too many requests — try again in an hour." };
  }

  if (!isTwilioConfigured()) {
    console.log(
      `\n${"=".repeat(70)}\n` +
        `📱  DEV SMS CODE — Twilio Verify not configured\n` +
        `${"=".repeat(70)}\n` +
        `to:    ${phone}\n` +
        `code:  ${DEV_SMS_CODE}\n` +
        `${"=".repeat(70)}\n`,
    );
    return { ok: true };
  }

  const { default: twilio } = await import("twilio");
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
  );
  try {
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: phone, channel: "sms" });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown Twilio error";
    return { ok: false, error: msg };
  }
}

export async function checkSmsCode(
  phone: string,
  code: string,
): Promise<boolean> {
  if (!isTwilioConfigured()) {
    return code === DEV_SMS_CODE;
  }

  const { default: twilio } = await import("twilio");
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
  );
  try {
    const result = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: phone, code });
    return result.status === "approved";
  } catch {
    return false;
  }
}
