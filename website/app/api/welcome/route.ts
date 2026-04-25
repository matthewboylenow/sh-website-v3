import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { sendTransactional } from "@/lib/email";

/**
 * Welcome form relay — handles POSTs from /im-new.
 *
 * Validates with the same Zod schema the form uses client-side, then
 * emails the configured `welcomeFormRecipients` from siteSettings.
 *
 * Rate-limited per IP (5 / hour). The cap is in-memory for now since
 * the parish site sees small traffic — a durable store can replace it
 * post-launch if abuse becomes a thing.
 */

export const runtime = "nodejs";

const Body = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.email(),
  reason: z.enum([
    "exploring",
    "new_to_area",
    "looking_for_parish",
    "returning",
    "kids_for_formation",
    "other",
  ]),
});

const REASON_LABELS: Record<z.infer<typeof Body>["reason"], string> = {
  exploring: "Just exploring",
  new_to_area: "New to the area",
  looking_for_parish: "Looking for a parish home",
  returning: "Coming back to the Church",
  kids_for_formation: "Kids for Faith Formation",
  other: "Other",
};

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

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fill out all fields.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Pull the configured welcome-form recipients from site settings.
  const [settings] = await db
    .select({
      welcomeFormRecipients: siteSettings.welcomeFormRecipients,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);

  const recipients = settings?.welcomeFormRecipients ?? [];
  if (recipients.length === 0) {
    return NextResponse.json(
      {
        error:
          "Welcome relay not configured. An admin needs to set recipients in /admin/settings.",
      },
      { status: 500 },
    );
  }

  const v = parsed.data;
  const reasonLabel = REASON_LABELS[v.reason];

  try {
    await sendTransactional({
      to: recipients,
      subject: `New welcome form submission — ${v.firstName} ${v.lastName}`,
      replyTo: v.email,
      html: renderHtml({ ...v, reasonLabel }),
      text: renderText({ ...v, reasonLabel }),
      tags: [{ name: "type", value: "welcome-form" }],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 502 },
    );
  }
}

function renderHtml(v: {
  firstName: string;
  lastName: string;
  email: string;
  reasonLabel: string;
}): string {
  return `
<!doctype html>
<html><body style="font-family:Helvetica,Arial,sans-serif;background:#FAF9F7;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #E5E5E5;border-radius:12px;padding:32px;">
    <p style="color:#CD5334;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;margin:0 0 8px;">New welcome form</p>
    <h1 style="font-family:Georgia,serif;color:#1F346D;margin:0 0 24px;font-size:22px;">${escapeHtml(v.firstName)} ${escapeHtml(v.lastName)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6B6B6B;width:120px;">Email</td><td style="padding:6px 0;"><a href="mailto:${encodeURIComponent(v.email)}" style="color:#A73F25;">${escapeHtml(v.email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#6B6B6B;">Reason</td><td style="padding:6px 0;">${escapeHtml(v.reasonLabel)}</td></tr>
    </table>
    <p style="color:#6B6B6B;font-size:12px;margin:24px 0 0;">Reply directly to this email to reach them.</p>
  </div>
</body></html>`;
}

function renderText(v: {
  firstName: string;
  lastName: string;
  email: string;
  reasonLabel: string;
}): string {
  return [
    `New welcome form submission`,
    ``,
    `Name:   ${v.firstName} ${v.lastName}`,
    `Email:  ${v.email}`,
    `Reason: ${v.reasonLabel}`,
    ``,
    `Reply directly to this email to reach them.`,
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
