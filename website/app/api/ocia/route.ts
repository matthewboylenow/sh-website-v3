import { NextResponse } from "next/server";
import { renderOciaPdf } from "@/lib/pdf/ocia";
import { processIntakeSubmission } from "@/lib/intake-submission";
import { OciaSubmitSchema, type OciaSubmission } from "@/lib/validators/ocia";

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

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderEmailHtml(v: OciaSubmission): string {
  const name = escapeHtml(`${v.firstName} ${v.lastName}`.trim());
  return `
  <div style="background:#FAF9F7;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#26303f;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <p style="margin:0;color:#A73F25;font-size:12px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;">New OCIA inquirer</p>
      <h1 style="margin:8px 0 16px;color:#1F346D;font-size:22px;">${name}</h1>
      <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml(v.email)}</p>
      ${v.phone ? `<p style="margin:0 0 8px;"><strong>Phone:</strong> ${escapeHtml(v.phone)}</p>` : ""}
      ${v.baptized ? `<p style="margin:0 0 8px;"><strong>Baptized:</strong> ${escapeHtml(v.baptized)}</p>` : ""}
      ${v.resonates ? `<p style="margin:0 0 8px;"><strong>Where they are:</strong> ${escapeHtml(v.resonates)}</p>` : ""}
      <p style="margin:16px 0 0;color:#5b6472;font-size:13px;">The full submission is attached as a PDF and available in the admin under Form submissions. Reply to this email to reach the inquirer directly.</p>
    </div>
  </div>`;
}

function renderEmailText(v: OciaSubmission): string {
  return [
    `New OCIA inquirer — ${v.firstName} ${v.lastName}`,
    `Email: ${v.email}`,
    v.phone ? `Phone: ${v.phone}` : null,
    v.baptized ? `Baptized: ${v.baptized}` : null,
    v.resonates ? `Where they are: ${v.resonates}` : null,
    "",
    "Full submission attached as PDF; also in admin → Form submissions.",
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
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

  const parsed = OciaSubmitSchema.safeParse(body);
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
  const fullName = `${v.firstName} ${v.lastName}`.trim();

  let pdf: Buffer;
  try {
    pdf = await renderOciaPdf({ submission: v, submittedAt, submissionId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF render failed" },
      { status: 500 },
    );
  }

  try {
    const result = await processIntakeSubmission({
      kind: "ocia",
      formTitle: "OCIA Inquirer Form",
      submitterName: fullName,
      submitterEmail: v.email,
      subjectName: fullName,
      subjectDate: null,
      payload: v,
      pdfBuffer: pdf,
      emailSubject: `New OCIA inquirer — ${fullName}`,
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
