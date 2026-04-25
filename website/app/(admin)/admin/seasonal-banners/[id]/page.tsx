import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { seasonalBanners } from "@/db/schema";
import { assetUrl } from "@/lib/blob";
import { SeasonalBannerForm } from "../SeasonalBannerForm";

export const metadata = { title: "Edit banner · Admin" };

export default async function EditBannerPage({
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
    .from(seasonalBanners)
    .where(eq(seasonalBanners.id, id))
    .limit(1);
  if (!row) notFound();
  const photoPreviewUrl = await assetUrl(row.photoBlobKey);

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/seasonal-banners" className="hover:text-rust-dark">
          Seasonal banners
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{row.title}</span>
      </nav>
      <h1 className="text-3xl">{row.title}</h1>
      {saved && (
        <p className="mt-4 inline-block rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          Saved.
        </p>
      )}
      <div className="mt-8">
        <SeasonalBannerForm
          mode="edit"
          bannerId={row.id}
          defaultValues={row}
          photoPreviewUrl={photoPreviewUrl}
        />
      </div>
    </div>
  );
}
