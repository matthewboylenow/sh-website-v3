import { NextResponse } from "next/server";
import { renderBaptismPdf } from "@/lib/pdf/baptism";
import { processIntakeSubmission } from "@/lib/intake-submission";
import { BaptismSubmitSchema } from "@/lib/validators/baptism";

/**
 * Baptism intake relay. Validates the form, generates a PDF, stores
 * it in Vercel Blob + form_submissions, and emails the configured
 * baptismFormRecipients with the PDF attached.
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

  const parsed = BaptismSubmitSchema.safeParse(body);
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

  const childFullName = [v.childFirstName, v.childMiddleName, v.childLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const parentFullName = `${v.motherFirstName} ${v.motherLastName} & ${v.fatherFirstName} ${v.fatherLastName}`;

  let pdf: Buffer;
  try {
    pdf = await renderBaptismPdf({
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

  try {
    const result = await processIntakeSubmission({
      kind: "baptism",
      formTitle: "Baptism Intake Form",
      submitterName: parentFullName,
      submitterEmail: v.email,
      subjectName: childFullName,
      subjectDate: v.childDateOfBirth,
      payload: v,
      pdfBuffer: pdf,
      emailSubject: `New baptism intake — ${childFullName}`,
      emailHtml: renderEmailHtml({ child: childFullName, parents: parentFullName, v }),
      emailText: renderEmailText({ child: childFullName, parents: parentFullName, v }),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Submission failed" },
      { status: 502 },
    );
  }
}

function renderEmailHtml(args: {
  child: string;
  parents: string;
  v: { email: string; phone: string; childDateOfBirth: string; registeredParishioner: string };
}): string {
  const { child, parents, v } = args;
  return `
<!doctype html>
<html><body style="font-family:Helvetica,Arial,sans-serif;background:#FAF9F7;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #E5E5E5;border-radius:12px;padding:32px;">
    <p style="color:#A73F25;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;margin:0 0 8px;">New baptism intake</p>
    <h1 style="font-family:Georgia,serif;color:#1F346D;margin:0 0 24px;font-size:22px;">${escapeHtml(child)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6B6B6B;width:160px;">Parents</td><td style="padding:6px 0;">${escapeHtml(parents)}</td></tr>
      <tr><td style="padding:6px 0;color:#6B6B6B;">Email</td><td style="padding:6px 0;"><a href="mailto:${encodeURIComponent(v.email)}" style="color:#A73F25;">${escapeHtml(v.email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#6B6B6B;">Phone</td><td style="padding:6px 0;">${escapeHtml(v.phone)}</td></tr>
      <tr><td style="padding:6px 0;color:#6B6B6B;">Child's date of birth</td><td style="padding:6px 0;">${escapeHtml(v.childDateOfBirth)}</td></tr>
      <tr><td style="padding:6px 0;color:#6B6B6B;">Parishioner?</td><td style="padding:6px 0;">${escapeHtml(v.registeredParishioner)}</td></tr>
    </table>
    <p style="color:#6B6B6B;font-size:13px;margin:24px 0 0;">Full intake details are in the attached PDF. Reply directly to reach the family.</p>
  </div>
</body></html>`;
}

function renderEmailText(args: {
  child: string;
  parents: string;
  v: { email: string; phone: string; childDateOfBirth: string; registeredParishioner: string };
}): string {
  const { child, parents, v } = args;
  return [
    `New baptism intake`,
    ``,
    `Child:        ${child}`,
    `Parents:      ${parents}`,
    `Email:        ${v.email}`,
    `Phone:        ${v.phone}`,
    `DOB:          ${v.childDateOfBirth}`,
    `Parishioner?: ${v.registeredParishioner}`,
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
