import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { bulletins } from "@/db/schema";
import { assetUrl } from "@/lib/blob";
import { toDate } from "@/lib/dates";
import { BulletinForm } from "../BulletinForm";

export const metadata = { title: "Edit bulletin · Admin" };

export default async function EditBulletinPage({
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
    .from(bulletins)
    .where(eq(bulletins.id, id))
    .limit(1);
  if (!row) notFound();

  const pdfPreviewUrl = await assetUrl(row.pdfBlobKey);

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/bulletins" className="hover:text-rust-dark">
          Bulletins
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>
          {toDate(row.weekOf).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </nav>
      <h1 className="text-3xl">
        {row.title ??
          toDate(row.weekOf).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
      </h1>
      {saved && (
        <p className="mt-4 inline-block rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          Saved.
        </p>
      )}
      <div className="mt-8">
        <BulletinForm
          mode="edit"
          bulletinId={row.id}
          defaultValues={{
            weekOf:
              typeof row.weekOf === "string"
                ? row.weekOf
                : new Date(row.weekOf).toISOString().slice(0, 10),
            title: row.title,
            pdfBlobKey: row.pdfBlobKey,
            thumbBlobKey: row.thumbBlobKey,
            pageCount: row.pageCount,
            publishedAt: row.publishedAt,
          }}
          pdfPreviewUrl={pdfPreviewUrl}
        />
      </div>
    </div>
  );
}
