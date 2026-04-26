import Link from "next/link";
import { Container } from "@/components/site/Container";
import { InteriorHero } from "@/components/site/InteriorHero";
import { PhotoPlaceholder } from "@/components/site/PhotoPlaceholder";
import { resolveKeys } from "@/lib/blob";
import { toDate } from "@/lib/dates";
import {
  POST_CATEGORIES,
  getPublishedPosts,
} from "@/lib/queries/posts.query";
import { type PostCategory } from "@/db/schema";

export const metadata = {
  title: "From the parish",
  description: "Pastor letters and stewardship updates from Saint Helen.",
};
export const revalidate = 600;

const CATEGORY_LABEL: Record<PostCategory, string> = {
  pastor: "From the pastor",
  stewardship: "Stewardship",
};

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const filter =
    category && (POST_CATEGORIES as readonly string[]).includes(category)
      ? (category as PostCategory)
      : undefined;

  const posts = await getPublishedPosts(filter);
  const photoUrls = await resolveKeys(posts.map((p) => p.photoBlobKey));

  return (
    <>
      <InteriorHero
        eyebrow="From the parish"
        title="Latest from Saint Helen"
        lede="Letters from Msgr. Tom and updates on stewardship, finances, and our shared mission."
        photoTone="navy"
      />

      <section className="bg-white pt-10 pb-24">
        <Container width="wide">
          <div className="mb-10 flex flex-wrap items-center gap-2">
            <Link
              href="/blog"
              className={
                "rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors " +
                (!filter
                  ? "bg-navy text-white"
                  : "border border-rule bg-white text-navy hover:border-navy")
              }
            >
              All
            </Link>
            {POST_CATEGORIES.map((c) => (
              <Link
                key={c}
                href={`/blog?category=${c}`}
                className={
                  "rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors " +
                  (filter === c
                    ? "bg-navy text-white"
                    : "border border-rule bg-white text-navy hover:border-navy")
                }
              >
                {CATEGORY_LABEL[c]}
              </Link>
            ))}
          </div>

          {posts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-rule bg-cream/40 px-6 py-12 text-center text-ink-3">
              {filter
                ? `No ${CATEGORY_LABEL[filter].toLowerCase()} posts yet.`
                : "No posts published yet."}
            </p>
          ) : (
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => {
                const imageUrl = p.photoBlobKey ? photoUrls.get(p.photoBlobKey) : null;
                const author = p.authorName ?? p.authorFromUser ?? "Saint Helen";
                return (
                  <li key={p.id}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="group block overflow-hidden rounded-lg border border-rule bg-white transition-all hover:-translate-y-1 hover:shadow-hover"
                    >
                      <PhotoPlaceholder
                        imageUrl={imageUrl}
                        imageAlt={p.title}
                        label="Cover"
                        brief={p.title}
                        tone={p.category === "pastor" ? "warm" : "navy"}
                        aspect="16/9"
                        className="rounded-none border-0"
                      />
                      <div className="p-6">
                        <span className="sh-eyebrow">{CATEGORY_LABEL[p.category]}</span>
                        <h2 className="mt-2 font-serif text-xl font-bold text-navy group-hover:text-rust-dark">
                          {p.title}
                        </h2>
                        {p.summary && (
                          <p className="mt-2 text-sm text-ink-2">{p.summary}</p>
                        )}
                        <p className="mt-4 text-xs text-ink-3">
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
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Container>
      </section>
    </>
  );
}
