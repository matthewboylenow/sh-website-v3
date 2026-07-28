import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { assetUrl } from "@/lib/blob";
import { PageForm } from "../PageForm";
import { DeletePageButton } from "./DeletePageButton";

export const metadata = { title: "Edit page · Admin" };

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const [row] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!row) notFound();

  const [photoPreviewUrl, ogImagePreviewUrl] = await Promise.all([
    assetUrl(row.photoBlobKey),
    assetUrl(row.ogImageBlobKey),
  ]);

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/pages" className="hover:text-rust-dark">
          Pages
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{row.title}</span>
      </nav>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl">{row.title}</h1>
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/pages/${row.id}/sections`}
            className="text-sm font-semibold text-rust-dark hover:text-rust"
          >
            Sections →
          </Link>
          <Link
            href={`/${row.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-rust-dark hover:text-rust"
          >
            View on site →
          </Link>
        </div>
      </div>
      {saved && (
        <p className="mt-4 inline-block rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          Saved.
        </p>
      )}
      <div className="mt-8">
        <PageForm
          mode="edit"
          pageId={row.id}
          defaultValues={row}
          photoPreviewUrl={photoPreviewUrl}
          ogImagePreviewUrl={ogImagePreviewUrl}
        />
      </div>
      <div className="mt-8 border-t border-rule pt-6">
        <DeletePageButton pageId={row.id} />
      </div>
    </div>
  );
}
