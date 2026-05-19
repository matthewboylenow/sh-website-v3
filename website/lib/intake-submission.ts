import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  blobAssets,
  formSubmissions,
  siteSettings,
  type FormSubmissionKind,
} from "@/db/schema";
import { resolveAssetUrl } from "@/lib/blob";
import { sendTransactional } from "@/lib/email";

/**
 * Shared backend for /api/funerals + /api/baptism:
 *
 *   1. Generate PDF (caller supplies the Buffer).
 *   2. Upload to Vercel Blob (server-side via `put`).
 *   3. Insert blob_assets row so the PDF is treatable like any other
 *      asset in the media library.
 *   4. Insert form_submissions row referencing the asset.
 *   5. Email the configured recipients with the PDF attached AND a
 *      link to the Blob URL in case the attachment is stripped en
 *      route (some corporate filters drop PDFs).
 *
 * If recipients are unconfigured we still store the submission +
 * PDF so it isn't lost — the relay just skips the email step.
 */
export async function processIntakeSubmission(args: {
  kind: FormSubmissionKind;
  formTitle: string;
  submitterName: string;
  submitterEmail: string;
  subjectName: string | null;
  subjectDate: string | null;
  /** Validated payload, stored verbatim. */
  payload: object;
  /** PDF bytes — caller renders. */
  pdfBuffer: Buffer;
  /** Plain-text email body — caller writes. */
  emailText: string;
  /** HTML email body — caller writes. Will have the PDF link appended. */
  emailHtml: string;
  emailSubject: string;
}): Promise<{ submissionId: string; pdfUrl: string | null }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Dev: skip blob upload, still record + log email.
    return processDevFallback(args);
  }

  // ---- 1. Upload PDF to Blob ---------------------------------- //
  const safeSubject = (args.subjectName ?? "submission")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "submission";
  const stamp = new Date().toISOString().slice(0, 10);
  const pathname = `form-submissions/${args.kind}/${stamp}-${safeSubject}.pdf`;

  const blob = await put(pathname, args.pdfBuffer, {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 30,
  });

  // ---- 2. Record blob_assets row ------------------------------- //
  await db.insert(blobAssets).values({
    key: blob.pathname,
    blobUrl: blob.url,
    mimeType: "application/pdf",
    byteSize: args.pdfBuffer.byteLength,
    alt: `${args.formTitle}: ${args.subjectName ?? args.submitterName}`,
    uploadedBy: null,
  });

  const pdfUrl = resolveAssetUrl(blob.url);

  // ---- 3. Insert form_submissions row -------------------------- //
  const [submission] = await db
    .insert(formSubmissions)
    .values({
      kind: args.kind,
      payload: args.payload,
      submitterName: args.submitterName,
      submitterEmail: args.submitterEmail,
      subjectName: args.subjectName,
      subjectDate: args.subjectDate,
      pdfBlobKey: blob.pathname,
    })
    .returning({ id: formSubmissions.id });

  if (!submission) throw new Error("Submission insert returned no row");

  // ---- 4. Email recipients ------------------------------------ //
  const recipients = await getRecipients(args.kind);
  if (recipients.length > 0) {
    const htmlWithLink =
      args.emailHtml +
      `\n<p style="font-size:13px;color:#6B6B6B;margin-top:24px;">PDF copy: <a href="${pdfUrl}" style="color:#A73F25;">${pdfUrl}</a></p>`;
    const textWithLink =
      args.emailText + `\n\nPDF copy: ${pdfUrl}\n`;

    await sendTransactional({
      to: recipients,
      subject: args.emailSubject,
      replyTo: args.submitterEmail,
      html: htmlWithLink,
      text: textWithLink,
      tags: [{ name: "type", value: `${args.kind}-intake` }],
      attachments: [
        {
          filename: `${args.kind}-intake-${safeSubject}.pdf`,
          content: args.pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  } else {
    console.warn(
      `[${args.kind}] No recipients configured — submission saved but no email sent. ` +
        `Set ${args.kind}FormRecipients in /admin/settings.`,
    );
  }

  return { submissionId: submission.id, pdfUrl };
}

async function getRecipients(kind: FormSubmissionKind): Promise<string[]> {
  const [row] = await db
    .select({
      funeral: siteSettings.funeralFormRecipients,
      baptism: siteSettings.baptismFormRecipients,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!row) return [];
  return kind === "funeral" ? row.funeral : row.baptism;
}

/**
 * Dev fallback when BLOB_READ_WRITE_TOKEN isn't set. Skips the Blob
 * upload, still inserts the form_submissions row (without a PDF key)
 * so the admin list shows the submission, and dumps the email to the
 * console — matching the established `lib/email.ts` dev pattern.
 */
async function processDevFallback(args: {
  kind: FormSubmissionKind;
  submitterName: string;
  submitterEmail: string;
  subjectName: string | null;
  subjectDate: string | null;
  payload: object;
  emailText: string;
  emailHtml: string;
  emailSubject: string;
  pdfBuffer: Buffer;
}): Promise<{ submissionId: string; pdfUrl: string | null }> {
  const [submission] = await db
    .insert(formSubmissions)
    .values({
      kind: args.kind,
      payload: args.payload,
      submitterName: args.submitterName,
      submitterEmail: args.submitterEmail,
      subjectName: args.subjectName,
      subjectDate: args.subjectDate,
      pdfBlobKey: null,
    })
    .returning({ id: formSubmissions.id });

  if (!submission) throw new Error("Submission insert returned no row");

  const recipients = await getRecipients(args.kind);
  if (recipients.length > 0) {
    await sendTransactional({
      to: recipients,
      subject: args.emailSubject,
      replyTo: args.submitterEmail,
      html: args.emailHtml,
      text: args.emailText,
      tags: [{ name: "type", value: `${args.kind}-intake` }],
      attachments: [
        {
          filename: `${args.kind}-intake.pdf`,
          content: args.pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  }

  console.log(
    `[${args.kind}] BLOB_READ_WRITE_TOKEN missing — PDF (${args.pdfBuffer.byteLength} bytes) not uploaded.`,
  );

  return { submissionId: submission.id, pdfUrl: null };
}
