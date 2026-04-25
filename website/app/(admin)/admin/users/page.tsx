import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { ministries, users } from "@/db/schema";
import { toDate } from "@/lib/dates";
import { InviteUserForm } from "./InviteUserForm";
import { RoleSelector } from "./RoleSelector";

export const metadata = { title: "Users · Admin" };

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/users");
  if (session.user.role !== "admin") redirect("/admin");

  const [rows, ministryOptions] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        phone: users.phone,
        ministryId: users.ministryId,
        ministryName: ministries.name,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(ministries, eq(users.ministryId, ministries.id))
      .orderBy(asc(users.email)),
    db
      .select({ id: ministries.id, name: ministries.name })
      .from(ministries)
      .orderBy(asc(ministries.name)),
  ]);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="sh-eyebrow">Settings</span>
          <h1 className="mt-2 text-3xl">Users &amp; roles</h1>
          <p className="sh-lede mt-2 text-[15px]">
            Invite editors and ministry leads. Roles and ministry scopes can
            change any time.
          </p>
        </div>
      </header>

      <div className="mt-8">
        <InviteUserForm ministryOptions={ministryOptions} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule bg-cream text-[11px] uppercase tracking-[0.12em] text-ink-3">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Verified</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Role · Ministry scope</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-rule last:border-0 align-top">
                <td className="px-4 py-3">
                  <div className="font-serif text-base font-bold text-navy">
                    {r.name ?? "—"}
                  </div>
                  <div className="font-mono text-[11px] text-ink-3">{r.email}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-2">
                  {r.phone ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.emailVerified ? (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-700">
                      Yes
                    </span>
                  ) : (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-700">
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-ink-3">
                  {toDate(r.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <RoleSelector
                    userId={r.id}
                    currentRole={r.role}
                    currentMinistryId={r.ministryId}
                    ministryOptions={ministryOptions}
                    selfId={session.user.id}
                  />
                  {r.ministryName && r.role !== "ministry_lead" && (
                    <p className="mt-1 text-[11px] text-ink-3">
                      Linked to {r.ministryName} (only enforced for ministry leads).
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-ink-3">
        Deactivation lands post-launch — for now, change someone&rsquo;s role
        to limit access. Hard delete via Drizzle Studio if truly needed.
      </p>
    </div>
  );
}
