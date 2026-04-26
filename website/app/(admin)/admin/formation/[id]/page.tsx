import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { formationPages, staff } from "@/db/schema";
import { assetUrl } from "@/lib/blob";
import { getSiteSettings } from "@/lib/queries/site-settings.query";
import { FormationForm } from "../FormationForm";

export const metadata = { title: "Edit formation page · Admin" };

export default async function EditFormationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const [row] = await db
    .select()
    .from(formationPages)
    .where(eq(formationPages.id, id))
    .limit(1);
  if (!row) notFound();

  const [staffOptions, photoPreviewUrl, settings] = await Promise.all([
    db
      .select({ id: staff.id, name: staff.name })
      .from(staff)
      .orderBy(asc(staff.orderingPriority), asc(staff.name)),
    assetUrl(row.photoBlobKey),
    getSiteSettings(),
  ]);
  const tax = settings?.taxonomies ?? {
    eventCategories: [],
    eventAudiences: [],
    ministryAudiences: [],
  };

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/formation" className="hover:text-rust-dark">Formation</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{row.name}</span>
      </nav>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl">{row.name}</h1>
        <div className="flex flex-wrap items-baseline gap-4">
          <Link
            href={`/admin/formation/${row.id}/sections`}
            className="text-sm font-semibold text-rust-dark hover:text-rust"
          >
            Edit sections →
          </Link>
          {row.status === "published" && (
            <Link
              href={`/formation/${row.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-rust-dark hover:text-rust"
            >
              View on site →
            </Link>
          )}
        </div>
      </div>
      {saved && (
        <p className="mt-4 inline-block rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          Saved.
        </p>
      )}
      <div className="mt-8">
        <FormationForm
          mode="edit"
          pageId={row.id}
          staffOptions={staffOptions}
          audienceOptions={tax.ministryAudiences}
          defaultValues={row}
          photoPreviewUrl={photoPreviewUrl}
        />
      </div>
    </div>
  );
}
