import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/Container";
import { PhotoPlaceholder } from "@/components/site/PhotoPlaceholder";
import { RichTextRenderer } from "@/components/site/RichTextRenderer";
import { assetUrl } from "@/lib/blob";
import { toDate } from "@/lib/dates";
import { getPostBySlug } from "@/lib/queries/posts.query";
import { buildSeoMetadata } from "@/lib/seo";
import type { PostCategory } from "@/db/schema";

export const revalidate = 600;

const CATEGORY_LABEL: Record<PostCategory, string> = {
  pastor: "From the pastor",
  stewardship: "Stewardship",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPostBySlug(slug);
  if (!data) return { title: "Post not found" };
  return buildSeoMetadata({
    row: data.post,
    fallbackTitle: data.post.title,
    fallbackDescription: data.post.summary ?? data.post.body ?? null,
    fallbackOgBlobKey: data.post.photoBlobKey,
    path: `/blog/${data.post.slug}`,
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPostBySlug(slug);
  if (!data) notFound();

  const p = data.post;
  const photoUrl = await assetUrl(p.photoBlobKey);
  const author = p.authorName ?? data.authorFromUser ?? "Saint Helen";

  return (
    <article>
      <section className="bg-cream pt-28 pb-12 sm:pt-32 sm:pb-16">
        <Container width="narrow">
          <nav className="mb-4 text-xs text-ink-3">
            <Link href="/" className="hover:text-rust-dark">Home</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <Link href="/blog" className="hover:text-rust-dark">Blog</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span aria-current="page">{p.title}</span>
          </nav>
          <span className="sh-eyebrow">{CATEGORY_LABEL[p.category]}</span>
          <h1 className="mt-3 text-[clamp(36px,4.4vw,56px)]">{p.title}</h1>
          <p className="mt-4 text-sm text-ink-3">
            {p.publishedAt
              ? toDate(p.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : ""}
            {" · "}
            {author}
          </p>
          {/* No dek here: post summaries are excerpts of the opening
              paragraph, so repeating one above the body reads as a
              stutter. Summaries still serve the blog index cards. */}
        </Container>
      </section>

      {/* Cover only when the post actually has one — and sized as an
          inset figure, not a full-bleed banner. The archive photos vary
          wildly in aspect and quality; a restrained 3:2 crop anchored
          toward the top keeps faces in frame. */}
      {photoUrl && (
        <section className="bg-white pt-10">
          <Container width="narrow">
            <PhotoPlaceholder
              imageUrl={photoUrl}
              imageAlt={p.title}
              label="Cover"
              brief={p.title}
              tone={p.category === "pastor" ? "warm" : "navy"}
              aspect="3/2"
              imagePosition="center 25%"
            />
          </Container>
        </section>
      )}

      <section className="bg-white py-16">
        <Container width="narrow">
          {p.body ? (
            <div className="sh-prose text-[17px] leading-[1.7]">
              <RichTextRenderer html={p.body} />
            </div>
          ) : (
            <p className="text-ink-3">This post has no body yet.</p>
          )}

          <div className="mt-16 border-t border-rule pt-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-rust-dark hover:text-rust"
            >
              ← All posts
            </Link>
          </div>
        </Container>
      </section>
    </article>
  );
}
