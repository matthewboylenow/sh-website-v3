import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { assetUrl } from "@/lib/blob";
import { AnnouncementForm } from "../AnnouncementForm";

export const metadata = { title: "Edit announcement · Admin" };

export default async function EditAnnouncementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const session = await auth();
  if (!session?.user)
    redirect(`/sign-in?callbackUrl=/admin/settings/announcements/${id}`);
  if (session.user.role !== "admin") redirect("/admin");

  const [row] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);
  if (!row) notFound();

  const imagePreviewUrl = await assetUrl(row.imageBlobKey);

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/settings/announcements" className="hover:text-rust-dark">
          Announcements
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
        <AnnouncementForm
          mode="edit"
          id={row.id}
          defaultValues={row}
          imagePreviewUrl={imagePreviewUrl}
        />
      </div>
    </div>
  );
}
