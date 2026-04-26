import { and, desc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { POST_CATEGORIES, posts, users, type PostCategory } from "@/db/schema";

export const getPublishedPosts = unstable_cache(
  async (category?: PostCategory) => {
    const where = category
      ? and(eq(posts.status, "published"), eq(posts.category, category))
      : eq(posts.status, "published");
    return db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        summary: posts.summary,
        category: posts.category,
        photoBlobKey: posts.photoBlobKey,
        publishedAt: posts.publishedAt,
        authorName: posts.authorName,
        authorFromUser: users.name,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(where)
      .orderBy(desc(posts.publishedAt));
  },
  ["posts:published"],
  { tags: ["posts"], revalidate: 600 },
);

export const getPostBySlug = unstable_cache(
  async (slug: string) =>
    db
      .select({
        post: posts,
        authorFromUser: users.name,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ["posts:by-slug"],
  { tags: ["posts"], revalidate: 600 },
);

export { POST_CATEGORIES };
