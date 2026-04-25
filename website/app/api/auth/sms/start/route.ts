import { NextResponse } from "next/server";
import { z } from "zod";
import { sendSmsCode } from "@/lib/sms";

const Body = z.object({
  // Light client-side check; Twilio Verify validates the actual format.
  phone: z.string().min(7).max(20),
});

/**
 * Step 1 of the SMS sign-in flow. POST { phone }. Triggers Twilio
 * Verify to send a 6-digit code. Step 2 (code entry) goes through
 * the normal `signIn("sms", { phone, code })` path which calls our
 * Credentials provider's authorize().
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
      { error: "Phone number is required (E.164 format, e.g. +15555551234)" },
      { status: 400 },
    );
  }

  const result = await sendSmsCode(parsed.data.phone);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to send code" }, { status: 429 });
  }
  return NextResponse.json({ ok: true });
}
