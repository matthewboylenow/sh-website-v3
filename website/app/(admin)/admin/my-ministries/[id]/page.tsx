import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { ministries, ministryEdits } from "@/db/schema";
import { toDate } from "@/lib/dates";
import { ENABLE_MINISTRY_SELF_SERVICE } from "@/lib/flags";
import { MyMinistryEditForm } from "./MyMinistryEditForm";

export const metadata = { title: "Edit my ministry · Admin" };

export default async function MyMinistryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/sign-in?callbackUrl=/admin/my-ministries/${id}`);

  const isPrivileged =
    session.user.role === "admin" || session.user.role === "editor";
  const leadsThis = session.user.ministryIds.includes(id);

  if (!isPrivileged && !leadsThis) {
    redirect("/admin/my-ministries");
  }
  if (!isPrivileged && !ENABLE_MINISTRY_SELF_SERVICE) notFound();

  const [ministry] = await db
    .select()
    .from(ministries)
    .where(eq(ministries.id, id))
    .limit(1);
  if (!ministry) notFound();

  const myEdits = await db
    .select()
    .from(ministryEdits)
    .where(eq(ministryEdits.submittedBy, session.user.id))
    .orderBy(desc(ministryEdits.submittedAt))
    .limit(10);

  return (
    <div className="max-w-3xl">
      <nav className="mb-2 text-xs text-ink-3">
        <Link href="/admin/my-ministries" className="hover:text-rust-dark">
          My ministries
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{ministry.name}</span>
      </nav>
      <header>
        <span className="sh-eyebrow">Ministry self-service</span>
        <h1 className="mt-2 text-3xl">{ministry.name}</h1>
        <p className="sh-lede mt-2 text-[15px]">
          Update the public details. Changes go to an admin for approval and
          apply once they&rsquo;re reviewed.
        </p>
      </header>

      {myEdits.length > 0 && (
        <section className="mt-8 rounded-lg border border-rule bg-white p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Recent edits
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {myEdits.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="text-ink-2">
                  {toDate(e.submittedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase ${
                    e.status === "pending"
                      ? "bg-amber-50 text-amber-700"
                      : e.status === "approved"
                        ? "bg-emerald-50 text-emerald-700"
                        : e.status === "rejected"
                          ? "bg-rust-pale text-rust-dark"
                          : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {e.status}
                </span>
                {e.reviewerNote && (
                  <span className="basis-full text-xs text-ink-3">
                    Reviewer: {e.reviewerNote}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <MyMinistryEditForm
          ministryId={ministry.id}
          defaults={{
            tagline: ministry.tagline,
            description: ministry.description,
            meetingCadence: ministry.meetingCadence,
            contactEmail: ministry.contactEmail,
            isAcceptingNew: ministry.isAcceptingNew,
          }}
        />
      </section>
    </div>
  );
}
