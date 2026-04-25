import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  ministries,
  ministryEdits,
  users,
  type MinistryEditProposed,
} from "@/db/schema";
import { toDate } from "@/lib/dates";
import { ApprovalActions } from "./ApprovalActions";

export const metadata = { title: "Approvals · Admin" };

const FIELD_LABELS: Record<keyof MinistryEditProposed, string> = {
  tagline: "Tagline",
  description: "Description",
  meetingCadence: "Meeting cadence",
  photoBlobKey: "Photo",
  contactEmail: "Contact email",
  faq: "FAQ",
  isAcceptingNew: "Accepting new members",
};

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/approvals");
  if (session.user.role !== "admin") redirect("/admin");

  const params = await searchParams;
  const filter = params.status === "all" ? "all" : "pending";

  const where =
    filter === "pending" ? eq(ministryEdits.status, "pending") : undefined;

  const rows = await db
    .select({
      edit: ministryEdits,
      ministry: {
        id: ministries.id,
        name: ministries.name,
        tagline: ministries.tagline,
        description: ministries.description,
        meetingCadence: ministries.meetingCadence,
        contactEmail: ministries.contactEmail,
        isAcceptingNew: ministries.isAcceptingNew,
      },
      submitter: { name: users.name, email: users.email },
    })
    .from(ministryEdits)
    .innerJoin(ministries, eq(ministryEdits.ministryId, ministries.id))
    .leftJoin(users, eq(ministryEdits.submittedBy, users.id))
    .where(where as never)
    .orderBy(desc(ministryEdits.submittedAt))
    .limit(100);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="sh-eyebrow">Settings</span>
          <h1 className="mt-2 text-3xl">Approvals</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Pending edits submitted by ministry leads. Review each diff and
            approve or reject. Approvals apply immediately and revalidate{" "}
            <code className="rounded bg-cream px-1 py-0.5 text-xs">/ministries</code>.
          </p>
        </div>
        <nav className="flex gap-1 text-sm">
          <a
            href="/admin/approvals"
            className={`rounded-pill px-4 py-1.5 font-semibold ${filter === "pending" ? "bg-navy text-white" : "text-ink-2 hover:bg-cream"}`}
          >
            Pending
          </a>
          <a
            href="/admin/approvals?status=all"
            className={`rounded-pill px-4 py-1.5 font-semibold ${filter === "all" ? "bg-navy text-white" : "text-ink-2 hover:bg-cream"}`}
          >
            All
          </a>
        </nav>
      </header>

      <div className="mt-8 space-y-6">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-rule bg-white p-12 text-center">
            <p className="font-serif text-lg font-bold text-navy">
              {filter === "pending" ? "No pending edits." : "No edits yet."}
            </p>
            <p className="mt-2 text-sm text-ink-3">
              Ministry leads submit edits from{" "}
              <code className="rounded bg-cream px-1 py-0.5 text-xs">
                /admin/edit-my-ministry
              </code>{" "}
              when the ministry self-service flag is on.
            </p>
          </div>
        ) : (
          rows.map(({ edit, ministry, submitter }) => (
            <article
              key={edit.id}
              className="overflow-hidden rounded-lg border border-rule bg-white"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule bg-cream px-6 py-4">
                <div>
                  <span className="sh-eyebrow">Ministry edit</span>
                  <h2 className="mt-1 font-serif text-xl font-bold text-navy">
                    {ministry.name}
                  </h2>
                </div>
                <div className="text-xs text-ink-3">
                  Submitted{" "}
                  {toDate(edit.submittedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {submitter?.email ? ` · by ${submitter.name ?? submitter.email}` : ""}
                  <StatusPill status={edit.status} />
                </div>
              </header>

              <div className="grid gap-6 p-6 md:grid-cols-[1fr_220px] md:items-start">
                <Diff proposed={edit.proposed} ministry={ministry} />
                {edit.status === "pending" ? (
                  <ApprovalActions editId={edit.id} />
                ) : edit.reviewerNote ? (
                  <p className="rounded-md bg-cream p-3 text-xs text-ink-2">
                    <strong>Reviewer note:</strong> {edit.reviewerNote}
                  </p>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "pending"
      ? "bg-amber-50 text-amber-700"
      : status === "approved"
        ? "bg-emerald-50 text-emerald-700"
        : status === "rejected"
          ? "bg-rust-pale text-rust-dark"
          : "bg-stone-100 text-stone-600";
  return (
    <span className={`ml-3 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${cls}`}>
      {status}
    </span>
  );
}

function Diff({
  proposed,
  ministry,
}: {
  proposed: MinistryEditProposed;
  ministry: {
    tagline: string | null;
    description: string | null;
    meetingCadence: string | null;
    contactEmail: string | null;
    isAcceptingNew: boolean;
  };
}) {
  const fieldKeys = Object.keys(proposed ?? {}) as (keyof MinistryEditProposed)[];

  if (fieldKeys.length === 0) {
    return <p className="text-sm text-ink-3">No fields proposed.</p>;
  }

  return (
    <dl className="space-y-4">
      {fieldKeys.map((k) => {
        const before =
          k === "isAcceptingNew"
            ? String(ministry.isAcceptingNew ?? "—")
            : k === "faq"
              ? "—"
              : k === "photoBlobKey"
                ? "—"
                : (ministry as Record<string, unknown>)[k] != null
                  ? String((ministry as Record<string, unknown>)[k])
                  : "—";
        const after =
          k === "faq"
            ? `${(proposed.faq ?? []).length} item(s)`
            : proposed[k] != null
              ? String(proposed[k])
              : "—";
        return (
          <div key={k} className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                {FIELD_LABELS[k]} · current
              </dt>
              <dd className="mt-1 whitespace-pre-wrap rounded-md bg-cream p-3 text-sm text-ink-2">
                {before}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rust-dark">
                Proposed
              </dt>
              <dd className="mt-1 whitespace-pre-wrap rounded-md border-l-4 border-rust bg-rust-pale p-3 text-sm text-ink">
                {after}
              </dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}
