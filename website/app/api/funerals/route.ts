import { NextResponse } from "next/server";
import { renderFuneralPdf } from "@/lib/pdf/funeral";
import { processIntakeSubmission } from "@/lib/intake-submission";
import { FuneralSubmitSchema } from "@/lib/validators/funeral";

/**
 * Funeral intake relay. Validates the form, generates a PDF, stores
 * it in Vercel Blob + form_submissions, and emails the configured
 * funeralFormRecipients with the PDF attached.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const RATE_LIMIT_MAX = 3;
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
      { error: "Too many submissions — try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = FuneralSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please double-check the required fields.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const v = parsed.data;
  const submittedAt = new Date();
  const submissionId = crypto.randomUUID();

  let pdf: Buffer;
  try {
    pdf = await renderFuneralPdf({
      submission: v,
      submittedAt,
      submissionId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF render failed" },
      { status: 500 },
    );
  }

  const subjectLine = `New funeral intake — ${v.deceasedName} (Mass ${v.massDate})`;

  try {
    const result = await processIntakeSubmission({
      kind: "funeral",
      formTitle: "Funeral Intake Form",
      submitterName: v.fillerName,
      submitterEmail: v.fillerEmail,
      subjectName: v.deceasedName,
      subjectDate: v.massDate,
      payload: v,
      pdfBuffer: pdf,
      emailSubject: subjectLine,
      emailHtml: renderEmailHtml(v),
      emailText: renderEmailText(v),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Submission failed" },
      { status: 502 },
    );
  }
}

function renderEmailHtml(v: {
  fillerName: string;
  fillerEmail: string;
  deceasedName: string;
  massDate: string;
  massTime: string;
  livestreamRequested: string;
  remains: string;
}): string {
  return `
<!doctype html>
<html><body style="font-family:Helvetica,Arial,sans-serif;background:#FAF9F7;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #E5E5E5;border-radius:12px;padding:32px;">
    <p style="color:#A73F25;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;margin:0 0 8px;">New funeral intake</p>
    <h1 style="font-family:Georgia,serif;color:#1F346D;margin:0 0 24px;font-size:22px;">${escapeHtml(v.deceasedName)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6B6B6B;width:160px;">Filed by</td><td style="padding:6px 0;">${escapeHtml(v.fillerName)} &lt;${escapeHtml(v.fillerEmail)}&gt;</td></tr>
      <tr><td style="padding:6px 0;color:#6B6B6B;">Mass date</td><td style="padding:6px 0;">${escapeHtml(v.massDate)} at ${escapeHtml(v.massTime)}</td></tr>
      <tr><td style="padding:6px 0;color:#6B6B6B;">Remains</td><td style="padding:6px 0;">${escapeHtml(v.remains)}</td></tr>
      <tr><td style="padding:6px 0;color:#6B6B6B;">Livestream</td><td style="padding:6px 0;">${escapeHtml(v.livestreamRequested)}</td></tr>
    </table>
    <p style="color:#6B6B6B;font-size:13px;margin:24px 0 0;">Full intake details are in the attached PDF. Reply directly to reach the family.</p>
  </div>
</body></html>`;
}

function renderEmailText(v: {
  fillerName: string;
  fillerEmail: string;
  deceasedName: string;
  massDate: string;
  massTime: string;
  livestreamRequested: string;
  remains: string;
}): string {
  return [
    `New funeral intake`,
    ``,
    `Deceased:   ${v.deceasedName}`,
    `Filed by:   ${v.fillerName} <${v.fillerEmail}>`,
    `Mass date:  ${v.massDate} at ${v.massTime}`,
    `Remains:    ${v.remains}`,
    `Livestream: ${v.livestreamRequested}`,
    ``,
    `Full intake details are in the attached PDF.`,
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
