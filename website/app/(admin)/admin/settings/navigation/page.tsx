import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { DEFAULT_NAV_MANIFEST, siteSettings } from "@/db/schema";
import { NavEditor } from "./NavEditor";

export const metadata = { title: "Navigation · Admin" };

export default async function AdminNavSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/settings/navigation");
  if (session.user.role !== "admin") redirect("/admin");

  const [row] = await db
    .select()
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
        <span>Navigation</span>
      </nav>
      <h1 className="text-3xl">Navigation</h1>
      <p className="sh-lede mt-2 text-[15px]">
        The masthead pill nav. Each item is either a plain link or a 3-column
        mega-menu with link sections and an optional featured card. Drag-free
        reordering with arrows; up to 8 top-level items.
      </p>

      <div className="mt-8">
        <NavEditor initial={row.nav ?? DEFAULT_NAV_MANIFEST} />
      </div>
    </div>
  );
}
