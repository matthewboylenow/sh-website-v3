import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { TaxonomiesForm } from "./TaxonomiesForm";

export const metadata = { title: "Taxonomies · Admin" };

export default async function AdminTaxonomiesPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin/settings/taxonomies");
  if (session.user.role !== "admin") redirect("/admin");

  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!row) notFound();

  return (
    <div className="max-w-3xl">
      <nav className="mb-2 text-xs text-ink-3">
        <Link href="/admin/settings" className="hover:text-rust-dark">
          Site settings
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>Taxonomies</span>
      </nav>
      <h1 className="text-3xl">Taxonomies</h1>
      <p className="sh-lede mt-2 text-[15px]">
        Editable lists for event categories, event audiences, and ministry
        audiences. Editors pick from these as chips on each editor — keep the
        list tight so the dropdowns stay useful.
      </p>

      <div className="mt-8">
        <TaxonomiesForm
          initial={
            row.taxonomies ?? {
              eventCategories: [],
              eventAudiences: [],
              ministryAudiences: [],
            }
          }
        />
      </div>
    </div>
  );
}
