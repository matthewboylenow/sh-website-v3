import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { sendTransactional } from "@/lib/email";

/**
 * Prayer request relay — same shape as /api/welcome, different
 * recipients (siteSettings.prayerFormRecipients). Nothing is persisted;
 * requests go straight to the prayer team's inboxes. Ported from the
 * legacy FluentForms "Prayer Requests" (id 13) on sainthelen.org/prayers.
 */

export const runtime = "nodejs";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const recent = new Map<string, number[]>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const stamps = (recent.get(ip) ?? []).filter((t) => t > cutoff);
  if (stamps.length >= RATE_LIMIT_MAX) {
    recent.set(ip, stamps);
    return false;
  }
  stamps.push(now);
  recent.set(ip, stamps);
  return true;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

const PrayerRequestSchema = z.object({
  email: z.email("Enter a valid email"),
  personName: z.string().min(1, "Required").max(200),
  reason: z.string().min(1, "Required").max(4000),
  phone: z.string().max(40).optional().nullable().or(z.literal("")),
  comments: z.string().max(4000).optional().nullable().or(z.literal("")),
});

type PrayerRequest = z.infer<typeof PrayerRequestSchema>;

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderHtml(v: PrayerRequest): string {
  return `
  <div style="background:#FAF9F7;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#26303f;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <p style="margin:0;color:#A73F25;font-size:12px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;">Prayer request</p>
      <h1 style="margin:8px 0 16px;color:#1F346D;font-size:22px;">Please pray for ${escapeHtml(v.personName)}</h1>
      <p style="margin:0 0 12px;white-space:pre-wrap;">${escapeHtml(v.reason)}</p>
      ${v.comments ? `<p style="margin:0 0 12px;color:#5b6472;white-space:pre-wrap;"><strong>Comments:</strong> ${escapeHtml(v.comments)}</p>` : ""}
      <hr style="border:none;border-top:1px solid #e7e2d9;margin:16px 0;" />
      <p style="margin:0;color:#5b6472;font-size:13px;">
        Requested by ${escapeHtml(v.email)}${v.phone ? ` · ${escapeHtml(v.phone)}` : ""}.
        Reply to this email to reach them directly.
      </p>
    </div>
  </div>`;
}

function renderText(v: PrayerRequest): string {
  return [
    `Prayer request — please pray for ${v.personName}`,
    "",
    v.reason,
    v.comments ? `\nComments: ${v.comments}` : null,
    "",
    `Requested by ${v.email}${v.phone ? ` · ${v.phone}` : ""}`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req))) {
    return NextResponse.json(
      { error: "Too many requests — try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PrayerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please fill out the required fields.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const v = parsed.data;

  const [settings] = await db
    .select({ recipients: siteSettings.prayerFormRecipients })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  const recipients = settings?.recipients ?? [];
  if (recipients.length === 0) {
    return NextResponse.json(
      {
        error:
          "Prayer request relay not configured. An admin needs to set recipients in /admin/settings.",
      },
      { status: 500 },
    );
  }

  try {
    await sendTransactional({
      to: recipients,
      subject: `Prayer request — ${v.personName}`,
      replyTo: v.email,
      html: renderHtml(v),
      text: renderText(v),
      tags: [{ name: "type", value: "prayer-request" }],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
