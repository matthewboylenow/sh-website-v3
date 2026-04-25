import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { inquiries, ministries } from "@/db/schema";
import {
  verifyInquiryToken,
  type InquiryAction,
} from "@/lib/inquiry-tokens";
import { applyInquiryActionToken } from "./_actions";
import { Container } from "@/components/site/Container";

export const metadata = {
  title: "Update inquiry · Saint Helen",
  // Email security scanners pre-fetch links — keep this page out of indexes
  // and don't render anything destructive on GET.
  robots: { index: false, follow: false },
};

const ACTION_LABEL: Record<InquiryAction, { verb: string; nextStatus: string }> = {
  contacted: { verb: "Mark as contacted", nextStatus: "Contacted" },
  joined: { verb: "Mark as joined", nextStatus: "Joined" },
  stuck: { verb: "Mark as stuck (no reply)", nextStatus: "Stuck" },
};

export default async function InquiryActionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { token } = await params;
  const { confirmed } = await searchParams;

  const verified = verifyInquiryToken(token);
  if (!verified.ok) {
    return (
      <Container width="narrow">
        <div className="my-16 rounded-lg border border-rule bg-white p-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-navy">Link expired</h1>
          <p className="mt-2 text-sm text-ink-2">
            {verified.reason === "expired"
              ? "This action link expired (24-hour limit). Open the inquiry directly to continue."
              : "We couldn't verify this link. It may have been mangled by an email client."}
          </p>
          <Link
            href="/admin/inquiries"
            className="mt-6 inline-flex items-center rounded-pill bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light"
          >
            Open inquiries dashboard
          </Link>
        </div>
      </Container>
    );
  }

  const [row] = await db
    .select({
      inquiry: inquiries,
      ministry: { name: ministries.name },
    })
    .from(inquiries)
    .innerJoin(ministries, eq(inquiries.ministryId, ministries.id))
    .where(eq(inquiries.id, verified.inquiryId))
    .limit(1);
  if (!row) {
    return (
      <Container width="narrow">
        <div className="my-16 rounded-lg border border-rule bg-white p-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-navy">
            Inquiry not found
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            It may have been deleted. Check the dashboard.
          </p>
        </div>
      </Container>
    );
  }

  const label = ACTION_LABEL[verified.action];
  const i = row.inquiry;
  const wasJustConfirmed = confirmed === "1";

  return (
    <Container width="narrow">
      <div className="my-16 rounded-lg border border-rule bg-white p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rust-dark">
          {row.ministry.name}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-navy">
          {wasJustConfirmed ? "Updated." : label.verb}
        </h1>
        <p className="mt-2 text-sm text-ink-2">
          {i.name} &middot;{" "}
          <a
            href={`mailto:${encodeURIComponent(i.email)}`}
            className="text-rust-dark hover:text-rust"
          >
            {i.email}
          </a>
        </p>

        {wasJustConfirmed ? (
          <div className="mt-6 rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Status set to <strong>{label.nextStatus}</strong>. We&rsquo;ve logged
            this in the inquiry timeline.
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-md border border-rule bg-cream/60 p-4 text-sm">
              <p>
                You&rsquo;re about to set this inquiry&rsquo;s status to{" "}
                <strong>{label.nextStatus}</strong>.
              </p>
              {i.status !== "new" && (
                <p className="mt-2 text-xs text-ink-3">
                  Current status: <strong>{i.status}</strong>. Confirming will
                  overwrite it.
                </p>
              )}
            </div>

            <form
              action={async () => {
                "use server";
                await applyInquiryActionToken(token);
              }}
              className="mt-6 flex flex-wrap gap-3"
            >
              <button
                type="submit"
                className="inline-flex items-center rounded-pill bg-rust px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
              >
                Confirm — {label.verb}
              </button>
              <Link
                href="/admin/inquiries"
                className="inline-flex items-center rounded-pill border border-rule bg-white px-6 py-2.5 text-sm font-semibold text-navy hover:border-navy"
              >
                Open dashboard instead
              </Link>
            </form>
          </>
        )}
      </div>
    </Container>
  );
}
