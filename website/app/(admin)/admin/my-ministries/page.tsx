import Link from "next/link";
import { asc, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { ministries } from "@/db/schema";

export const metadata = { title: "My ministries · Admin" };

export default async function MyMinistriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/my-ministries");

  const myIds = session.user.ministryIds ?? [];
  if (myIds.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl">My ministries</h1>
        <div className="mt-6 rounded-lg border border-rule bg-white p-8 text-center">
          <p className="font-serif text-lg font-bold text-navy">
            You don&rsquo;t lead any ministries yet.
          </p>
          <p className="mt-2 text-sm text-ink-2">
            An admin can assign you from{" "}
            <Link
              href="/admin/users"
              className="font-semibold text-rust-dark hover:text-rust"
            >
              Users &amp; roles
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const rows = await db
    .select({
      id: ministries.id,
      slug: ministries.slug,
      name: ministries.name,
      tagline: ministries.tagline,
      status: ministries.status,
      isAcceptingNew: ministries.isAcceptingNew,
    })
    .from(ministries)
    .where(inArray(ministries.id, myIds))
    .orderBy(asc(ministries.name));

  // Single ministry → redirect straight to the edit page so the lead
  // doesn't need an extra click on every visit.
  if (rows.length === 1) {
    redirect(`/admin/my-ministries/${rows[0]!.id}`);
  }

  return (
    <div>
      <header>
        <span className="sh-eyebrow">Ministry self-service</span>
        <h1 className="mt-2 text-3xl">My ministries</h1>
        <p className="sh-lede mt-2 text-[15px]">
          The {rows.length} ministr{rows.length === 1 ? "y" : "ies"} you lead.
          Pick one to update its public details.
        </p>
      </header>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((m) => (
          <li key={m.id}>
            <Link
              href={`/admin/my-ministries/${m.id}`}
              className="group block rounded-lg border border-rule bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-hover"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-serif text-xl font-bold text-navy">
                  {m.name}
                </h2>
                <StatusPill status={m.status} />
              </div>
              {m.tagline && (
                <p className="mt-2 text-sm text-ink-2">{m.tagline}</p>
              )}
              <p className="mt-3 text-xs text-ink-3">
                {m.isAcceptingNew ? "Accepting new members" : "Closed to new"}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-rust-dark group-hover:text-rust">
                Edit details →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusPill({ status }: { status: "draft" | "published" | "archived" }) {
  const cls =
    status === "published"
      ? "bg-emerald-50 text-emerald-700"
      : status === "draft"
        ? "bg-amber-50 text-amber-700"
        : "bg-stone-100 text-stone-600";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${cls}`}
    >
      {status}
    </span>
  );
}
