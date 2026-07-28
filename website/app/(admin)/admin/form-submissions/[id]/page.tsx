import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  formSubmissions,
  type FormSubmissionKind,
} from "@/db/schema";
import { assetUrl } from "@/lib/blob";
import { toDate } from "@/lib/dates";
import { buildFuneralSections } from "@/lib/pdf/funeral";
import { buildBaptismSections } from "@/lib/pdf/baptism";
import { buildOciaSections } from "@/lib/pdf/ocia";
import type { FuneralSubmission } from "@/lib/validators/funeral";
import type { BaptismSubmission } from "@/lib/validators/baptism";
import type { OciaSubmission } from "@/lib/validators/ocia";
import type { PdfSection } from "@/lib/pdf/intake-types";

export const metadata = { title: "Submission · Admin" };

const KIND_LABEL: Record<FormSubmissionKind, string> = {
  funeral: "Funeral intake",
  baptism: "Baptism intake",
  ocia: "OCIA inquirer",
};

export default async function FormSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/form-submissions");
  if (session.user.role === "ministry_lead") redirect("/admin");

  const { id } = await params;

  const [row] = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.id, id))
    .limit(1);

  if (!row) notFound();

  const kind = row.kind as FormSubmissionKind;
  const payload = row.payload as Record<string, unknown>;

  let sections: PdfSection[];
  try {
    sections =
      kind === "funeral"
        ? buildFuneralSections(payload as unknown as FuneralSubmission)
        : kind === "baptism"
          ? buildBaptismSections(payload as unknown as BaptismSubmission)
          : buildOciaSections(payload as unknown as OciaSubmission);
  } catch {
    sections = [
      {
        title: "Raw payload",
        fields: Object.entries(payload).map(([k, v]) => ({
          label: k,
          value: typeof v === "string" ? v : JSON.stringify(v),
        })),
      },
    ];
  }

  const pdfUrl = row.pdfBlobKey ? await assetUrl(row.pdfBlobKey) : null;

  return (
    <div>
      <Link
        href="/admin/form-submissions"
        className="text-xs text-ink-3 hover:text-rust-dark"
      >
        ← All submissions
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="sh-eyebrow">{KIND_LABEL[kind]}</span>
          <h1 className="mt-2 text-3xl">{row.subjectName ?? "Submission"}</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Submitted by{" "}
            <span className="font-semibold">{row.submitterName}</span> &lt;
            <a
              href={`mailto:${row.submitterEmail}`}
              className="text-rust-dark underline"
            >
              {row.submitterEmail}
            </a>
            &gt; on{" "}
            {toDate(row.createdAt).toLocaleString("en-US", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
        </div>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-pill bg-rust px-4 py-2 text-xs font-semibold text-white hover:bg-rust-dark"
          >
            Download PDF →
          </a>
        )}
      </header>

      <div className="mt-8 space-y-6">
        {sections.map((s, i) => {
          const filled = s.fields.filter(
            (f) => f.value && f.value.toString().trim(),
          );
          if (filled.length === 0) return null;
          return (
            <section
              key={i}
              className="rounded-lg border border-rule bg-white p-6 shadow-sm"
            >
              {s.eyebrow && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rust">
                  {s.eyebrow}
                </p>
              )}
              <h2 className="font-serif text-xl font-bold text-navy">
                {s.title}
              </h2>
              <dl className="mt-4 divide-y divide-rule">
                {filled.map((f, fi) => (
                  <div
                    key={fi}
                    className="grid gap-1 py-2.5 sm:grid-cols-[200px_1fr] sm:gap-4"
                  >
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                      {f.label}
                    </dt>
                    <dd className="text-sm text-ink whitespace-pre-wrap">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}
