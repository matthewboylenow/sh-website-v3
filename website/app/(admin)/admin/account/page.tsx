import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AccountForm } from "./AccountForm";

export const metadata = { title: "My account · Admin" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/account");

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      preferredAuthMethod: users.preferredAuthMethod,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!row) redirect("/sign-in");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }

  return (
    <div className="max-w-2xl">
      <header>
        <span className="sh-eyebrow">Settings</span>
        <h1 className="mt-2 text-3xl">My account</h1>
        <p className="sh-lede mt-2 text-[15px]">
          Update your name, phone, and sign-in preference. Email is the
          canonical identifier and can&rsquo;t be changed here — ask an admin
          if you need it updated.
        </p>
      </header>

      <div className="mt-8 rounded-lg border border-rule bg-white p-6">
        <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
          <dt className="text-ink-3">Email</dt>
          <dd className="font-mono">{row.email}</dd>
          <dt className="text-ink-3">Role</dt>
          <dd className="capitalize">{row.role.replace("_", " ")}</dd>
        </dl>
      </div>

      <div className="mt-6 rounded-lg border border-rule bg-white p-6">
        <h2 className="font-serif text-lg font-bold text-navy">Profile</h2>
        <div className="mt-4">
          <AccountForm
            initial={{
              name: row.name,
              phone: row.phone,
              preferredAuthMethod: row.preferredAuthMethod,
            }}
          />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-rule bg-white p-6">
        <h2 className="font-serif text-lg font-bold text-navy">Sessions</h2>
        <p className="mt-2 text-sm text-ink-2">
          Sign out of this device. The &ldquo;sign me out everywhere&rdquo;
          feature lands post-launch (needs a small schema change to track
          session versions — see{" "}
          <code className="rounded bg-cream px-1 py-0.5 text-xs">backend.html §17</code>).
        </p>
        <form action={signOutAction} className="mt-4">
          <button
            type="submit"
            className="rounded-pill border border-rule bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-navy"
          >
            Sign out of this device
          </button>
        </form>
      </div>
    </div>
  );
}
