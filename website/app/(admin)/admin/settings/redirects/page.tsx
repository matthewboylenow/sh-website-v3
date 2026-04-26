import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { RedirectsEditor } from "./RedirectsEditor";

export const metadata = { title: "Redirects · Admin" };

export default async function AdminRedirectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/settings/redirects");
  if (session.user.role !== "admin") redirect("/admin");

  const [row] = await db
    .select({ redirects: siteSettings.redirects })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!row) notFound();

  return (
    <div>
      <nav className="mb-2 text-xs text-ink-3">
        <Link href="/admin/settings" className="hover:text-rust-dark">
          Site settings
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>Redirects</span>
      </nav>
      <h1 className="text-3xl">Redirects</h1>
      <p className="sh-lede mt-2 text-[15px]">
        Vanity URLs for the public site. <code>/youth</code> →{" "}
        <code>/ministries/youth-ministry</code>, that kind of thing. Saved
        instantly — no deploy. Skipped on <code>/admin/*</code> and{" "}
        <code>/api/*</code> automatically.
      </p>

      <div className="mt-8">
        <RedirectsEditor initial={row.redirects ?? []} />
      </div>
    </div>
  );
}
