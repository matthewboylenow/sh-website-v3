import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  inquiries,
  inquiryEvents,
  ministries,
  ministryLeads,
  users,
} from "@/db/schema";
import { toDate } from "@/lib/dates";
import { InquiryActions } from "./InquiryActions";

export const metadata = { title: "Inquiry · Admin" };

const STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  joined: "Joined",
  declined: "Declined",
  stuck: "Stuck",
} as const;

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/inquiries");

  const { id } = await params;

  const [row] = await db
    .select({
      inquiry: inquiries,
      ministry: {
        id: ministries.id,
        name: ministries.name,
        slug: ministries.slug,
      },
      assignee: { id: users.id, name: users.name, email: users.email },
    })
    .from(inquiries)
    .innerJoin(ministries, eq(inquiries.ministryId, ministries.id))
    .leftJoin(users, eq(inquiries.assignedTo, users.id))
    .where(eq(inquiries.id, id))
    .limit(1);
  if (!row) notFound();

  // Authorization: admin/editor see all; ministry_lead must own it.
  const role = session.user.role;
  const myIds = session.user.ministryIds ?? [];
  if (
    role !== "admin" &&
    role !== "editor" &&
    !myIds.includes(row.inquiry.ministryId)
  ) {
    redirect("/admin");
  }

  const [events, leadOptions] = await Promise.all([
    db
      .select({
        id: inquiryEvents.id,
        kind: inquiryEvents.kind,
        payload: inquiryEvents.payload,
        viaToken: inquiryEvents.viaToken,
        at: inquiryEvents.at,
        actor: { name: users.name, email: users.email },
      })
      .from(inquiryEvents)
      .leftJoin(users, eq(inquiryEvents.userId, users.id))
      .where(eq(inquiryEvents.inquiryId, row.inquiry.id))
      .orderBy(asc(inquiryEvents.at)),
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(ministryLeads)
      .innerJoin(users, eq(ministryLeads.userId, users.id))
      .where(eq(ministryLeads.ministryId, row.inquiry.ministryId))
      .orderBy(asc(users.name)),
  ]);

  const i = row.inquiry;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <nav className="text-xs text-ink-3">
          <Link href="/admin/inquiries" className="hover:text-rust-dark">
            Inquiries
          </Link>
          <span aria-hidden="true" className="mx-2">/</span>
          <span>{i.name}</span>
        </nav>

        <header className="rounded-lg border border-rule bg-white p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rust-dark">
            {i.kind}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-navy">{i.name}</h1>
          <p className="mt-1 text-sm text-ink-2">
            for{" "}
            <Link
              href={`/admin/ministries/${row.ministry.id}`}
              className="font-semibold text-rust-dark hover:text-rust"
            >
              {row.ministry.name}
            </Link>
            {" · submitted "}
            {toDate(i.createdAt).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                Email
              </dt>
              <dd className="mt-1 font-mono text-sm">
                <a
                  href={`mailto:${encodeURIComponent(i.email)}`}
                  className="text-rust-dark hover:text-rust"
                >
                  {i.email}
                </a>
              </dd>
            </div>
            {i.phone && (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                  Phone
                </dt>
                <dd className="mt-1 font-mono text-sm">{i.phone}</dd>
              </div>
            )}
          </dl>

          {i.message && (
            <div className="mt-6">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                Message
              </dt>
              <dd className="mt-2 whitespace-pre-wrap rounded-md border border-rule bg-cream/60 p-4 text-sm text-ink">
                {i.message}
              </dd>
            </div>
          )}

          {i.customAnswers && Object.keys(i.customAnswers).length > 0 && (
            <div className="mt-6">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                Custom answers
              </dt>
              <dl className="mt-2 grid gap-2">
                {Object.entries(i.customAnswers).map(([k, v]) => (
                  <div key={k} className="rounded-md border border-rule bg-cream/60 p-3">
                    <dt className="text-[11px] font-semibold text-ink-3">{k}</dt>
                    <dd className="mt-0.5 text-sm">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </header>

        <section className="rounded-lg border border-rule bg-white p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Timeline
          </h2>
          <ol className="mt-4 space-y-4">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="mt-1 inline-block size-2 shrink-0 rounded-full bg-navy" />
                <div className="flex-1">
                  <p className="font-semibold text-navy">{eventLabel(e)}</p>
                  <p className="text-xs text-ink-3">
                    {toDate(e.at).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {e.actor?.name && <> · {e.actor.name}</>}
                    {e.viaToken && <> · via email link</>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="space-y-6">
        <InquiryActions
          inquiryId={i.id}
          currentStatus={i.status}
          currentNotes={i.notes ?? ""}
          currentAssigneeId={i.assignedTo ?? null}
          assignee={row.assignee?.id ? row.assignee : null}
          leadOptions={leadOptions}
        />
      </aside>
    </div>
  );
}

function eventLabel(e: {
  kind: "created" | "status_change" | "note_added" | "assigned";
  payload: unknown;
}): string {
  const p = e.payload as Record<string, unknown> | null;
  switch (e.kind) {
    case "created": {
      const k = p?.["kind"];
      return `Submitted${typeof k === "string" ? ` — ${k}` : ""}`;
    }
    case "status_change": {
      const to = p?.["to"];
      return `Status → ${typeof to === "string" ? STATUS_LABELS[to as keyof typeof STATUS_LABELS] ?? to : "?"}`;
    }
    case "note_added":
      return "Note added";
    case "assigned": {
      const to = p?.["to"];
      return to ? "Reassigned" : "Unassigned";
    }
    default:
      return e.kind;
  }
}
