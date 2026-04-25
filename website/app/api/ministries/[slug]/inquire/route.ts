import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { inquiries, inquiryEvents, ministries, ministryLeads, users } from "@/db/schema";
import { sendTransactional } from "@/lib/email";
import { signInquiryToken } from "@/lib/inquiry-tokens";
import { InquirySubmitSchema } from "@/lib/validators/inquiries";

/**
 * Public inquiry submission. POSTs from a per-ministry form on
 * /ministries/[slug]. Validates, inserts an `inquiries` row, fires
 * one `created` event, and emails every lead of that ministry with
 * the inquiry detail + magic-link action buttons.
 *
 * Rate-limited per IP — 5 submissions / hour, in-memory.
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!rateLimit(clientIp(req))) {
    return NextResponse.json(
      { error: "Too many requests — try again later." },
      { status: 429 },
    );
  }

  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = InquirySubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fill out all required fields.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Look up the ministry + its inquiry config + leads.
  const [ministry] = await db
    .select({
      id: ministries.id,
      name: ministries.name,
      inquiryConfig: ministries.inquiryConfig,
    })
    .from(ministries)
    .where(eq(ministries.slug, slug))
    .limit(1);
  if (!ministry) {
    return NextResponse.json({ error: "Ministry not found" }, { status: 404 });
  }

  // Reject if the form is disabled or this kind isn't enabled.
  const cfg = ministry.inquiryConfig;
  if (!cfg.enabled) {
    return NextResponse.json(
      { error: "Inquiries are not currently accepted for this ministry." },
      { status: 403 },
    );
  }
  const button = cfg.buttons.find((b) => b.kind === parsed.data.kind && b.enabled);
  if (!button) {
    return NextResponse.json(
      { error: "That option isn't available for this ministry." },
      { status: 400 },
    );
  }

  // Insert inquiry + creation event.
  const [inquiry] = await db
    .insert(inquiries)
    .values({
      ministryId: ministry.id,
      kind: parsed.data.kind,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      message: parsed.data.message ?? null,
      customAnswers: parsed.data.customAnswers,
    })
    .returning({ id: inquiries.id });
  if (!inquiry) {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  await db.insert(inquiryEvents).values({
    inquiryId: inquiry.id,
    kind: "created",
    payload: { kind: parsed.data.kind, source: "public-form" },
  });

  // Find lead emails. Notify all leads + admins listed as leads of this ministry.
  const leadRows = await db
    .select({ email: users.email, name: users.name })
    .from(ministryLeads)
    .innerJoin(users, eq(ministryLeads.userId, users.id))
    .where(eq(ministryLeads.ministryId, ministry.id));

  const recipients = leadRows.map((r) => r.email);
  if (recipients.length === 0) {
    // Fall back to siteSettings.welcomeFormRecipients so inquiries
    // don't black-hole when no lead is assigned. We'd query that here,
    // but for v1 we just log + return ok so the visitor never sees a
    // failure if a ministry was misconfigured.
    console.warn(
      `[inquiry] no leads for ministry ${ministry.name} (${ministry.id}) — submission stored without email`,
    );
  } else {
    try {
      await emailLeads({
        ministryName: ministry.name,
        ministrySlug: slug,
        inquiryId: inquiry.id,
        recipients,
        kind: parsed.data.kind,
        kindLabel: button.label,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        message: parsed.data.message ?? null,
      });
    } catch (err) {
      // Email failure shouldn't lose the inquiry; log + carry on.
      console.error("[inquiry] email send failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}

async function emailLeads(args: {
  ministryName: string;
  ministrySlug: string;
  inquiryId: string;
  recipients: string[];
  kind: "join" | "inquire" | "volunteer";
  kindLabel: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
}) {
  const baseUrl =
    process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const tokenContacted = signInquiryToken(args.inquiryId, "contacted");
  const tokenJoined = signInquiryToken(args.inquiryId, "joined");
  const tokenStuck = signInquiryToken(args.inquiryId, "stuck");

  const linkContacted = `${baseUrl}/inquiries/${tokenContacted}`;
  const linkJoined = `${baseUrl}/inquiries/${tokenJoined}`;
  const linkStuck = `${baseUrl}/inquiries/${tokenStuck}`;
  const linkDashboard = `${baseUrl}/admin/inquiries/${args.inquiryId}`;

  await sendTransactional({
    to: args.recipients,
    subject: `${args.kindLabel} — ${args.name} (${args.ministryName})`,
    replyTo: args.email,
    html: htmlBody({ ...args, linkContacted, linkJoined, linkStuck, linkDashboard }),
    text: textBody({ ...args, linkContacted, linkJoined, linkStuck, linkDashboard }),
    tags: [
      { name: "type", value: "ministry-inquiry" },
      { name: "kind", value: args.kind },
    ],
  });
}

function htmlBody(v: {
  ministryName: string;
  kindLabel: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  linkContacted: string;
  linkJoined: string;
  linkStuck: string;
  linkDashboard: string;
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `
<!doctype html>
<html><body style="font-family:Helvetica,Arial,sans-serif;background:#FAF9F7;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #E5E5E5;border-radius:12px;padding:32px;">
    <p style="color:#CD5334;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;margin:0 0 8px;">${esc(v.kindLabel)}</p>
    <h1 style="font-family:Georgia,serif;color:#1F346D;margin:0 0 4px;font-size:22px;">${esc(v.name)}</h1>
    <p style="color:#6B6B6B;font-size:13px;margin:0 0 24px;">interested in <strong>${esc(v.ministryName)}</strong></p>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6B6B6B;width:90px;">Email</td><td style="padding:6px 0;"><a href="mailto:${encodeURIComponent(v.email)}" style="color:#A73F25;">${esc(v.email)}</a></td></tr>
      ${v.phone ? `<tr><td style="padding:6px 0;color:#6B6B6B;">Phone</td><td style="padding:6px 0;">${esc(v.phone)}</td></tr>` : ""}
      ${v.message ? `<tr><td style="padding:6px 0;color:#6B6B6B;vertical-align:top;">Message</td><td style="padding:6px 0;white-space:pre-wrap;">${esc(v.message)}</td></tr>` : ""}
    </table>

    <p style="margin:32px 0 12px;color:#1F346D;font-weight:600;font-size:13px;">Quick actions (24-hour links)</p>
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td><a href="${v.linkContacted}" style="display:inline-block;background:#1F346D;color:white;padding:10px 16px;border-radius:999px;font-weight:600;text-decoration:none;font-size:13px;margin-right:6px;">I&rsquo;ve contacted them</a></td>
        <td><a href="${v.linkJoined}" style="display:inline-block;background:#2E6E47;color:white;padding:10px 16px;border-radius:999px;font-weight:600;text-decoration:none;font-size:13px;margin-right:6px;">They joined</a></td>
        <td><a href="${v.linkStuck}" style="display:inline-block;background:#A73F25;color:white;padding:10px 16px;border-radius:999px;font-weight:600;text-decoration:none;font-size:13px;">Stuck — no reply</a></td>
      </tr>
    </table>

    <p style="margin:24px 0 0;color:#6B6B6B;font-size:12px;">
      Need more options? <a href="${v.linkDashboard}" style="color:#A73F25;">Open the full dashboard</a> (sign-in required) — add notes, change assignee, or reply to the visitor's email directly.
    </p>
  </div>
</body></html>`;
}

function textBody(v: {
  ministryName: string;
  kindLabel: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  linkContacted: string;
  linkJoined: string;
  linkStuck: string;
  linkDashboard: string;
}): string {
  return [
    `${v.kindLabel} — ${v.ministryName}`,
    ``,
    `Name:    ${v.name}`,
    `Email:   ${v.email}`,
    v.phone ? `Phone:   ${v.phone}` : "",
    v.message ? `Message: ${v.message}` : "",
    ``,
    `Quick actions (24-hour links):`,
    `  Contacted:  ${v.linkContacted}`,
    `  They joined: ${v.linkJoined}`,
    `  Stuck:      ${v.linkStuck}`,
    ``,
    `Full dashboard: ${v.linkDashboard}`,
  ]
    .filter(Boolean)
    .join("\n");
}
