import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhone, sendSmsCode } from "@/lib/sms";

const Body = z.object({
  phone: z.string().min(7).max(30),
});

/**
 * Step 1 of the SMS sign-in flow. POST { phone }. Normalizes the
 * input to E.164 (10-digit US numbers get a `+1` prefix), then asks
 * Twilio Verify to send a 6-digit code. Step 2 (code entry) goes
 * through the normal `signIn("sms", { phone, code })` path.
 *
 * Returns the normalized phone so the client can show a pretty
 * version on the next screen.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Phone number is required." },
      { status: 400 },
    );
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json(
      {
        error:
          "We couldn't read that phone number. Try a 10-digit US number (e.g. 908 555 1234) or include a country code like +44…",
      },
      { status: 400 },
    );
  }

  const result = await sendSmsCode(phone);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to send code" },
      { status: 429 },
    );
  }
  return NextResponse.json({ ok: true, phone });
}
