import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { assetUrl } from "@/lib/blob";
import { PostForm } from "../PostForm";

export const metadata = { title: "Edit post · Admin" };

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!row) notFound();

  const [photoPreviewUrl, ogImagePreviewUrl] = await Promise.all([
    assetUrl(row.photoBlobKey),
    assetUrl(row.ogImageBlobKey),
  ]);

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-3">
        <Link href="/admin/posts" className="hover:text-rust-dark">Posts</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{row.title}</span>
      </nav>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl">{row.title}</h1>
        {row.status === "published" && (
          <Link
            href={`/blog/${row.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-rust-dark hover:text-rust"
          >
            View on site →
          </Link>
        )}
      </div>
      {saved && (
        <p className="mt-4 inline-block rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          Saved.
        </p>
      )}
      <div className="mt-8">
        <PostForm
          mode="edit"
          postId={row.id}
          defaultValues={row}
          photoPreviewUrl={photoPreviewUrl}
          ogImagePreviewUrl={ogImagePreviewUrl}
        />
      </div>
    </div>
  );
}
