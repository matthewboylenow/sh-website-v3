import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  events,
  formationPages,
  ministries,
  pages,
  posts,
} from "@/db/schema";
import { SITE_ORIGIN } from "@/lib/seo";

export const revalidate = 3600;

/**
 * Pulls every published row from each public content type. Rows with
 * noindex=true are excluded so Google never sees them. Static routes
 * are listed up top for completeness.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [eventRows, ministryRows, formationRows, postRows, pageRows] =
    await Promise.all([
      db
        .select({
          slug: events.slug,
          updatedAt: events.updatedAt,
          noindex: events.noindex,
        })
        .from(events)
        .where(eq(events.status, "published")),
      db
        .select({
          slug: ministries.slug,
          updatedAt: ministries.updatedAt,
          noindex: ministries.noindex,
        })
        .from(ministries)
        .where(eq(ministries.status, "published")),
      db
        .select({
          slug: formationPages.slug,
          updatedAt: formationPages.updatedAt,
          noindex: formationPages.noindex,
        })
        .from(formationPages)
        .where(eq(formationPages.status, "published")),
      db
        .select({
          slug: posts.slug,
          updatedAt: posts.updatedAt,
          noindex: posts.noindex,
        })
        .from(posts)
        .where(eq(posts.status, "published")),
      db
        .select({
          slug: pages.slug,
          updatedAt: pages.updatedAt,
          noindex: pages.noindex,
        })
        .from(pages)
        .where(eq(pages.status, "published")),
    ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_ORIGIN}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_ORIGIN}/im-new`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_ORIGIN}/mass`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_ORIGIN}/events`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_ORIGIN}/ministries`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_ORIGIN}/formation`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_ORIGIN}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_ORIGIN}/bulletin`, changeFrequency: "weekly", priority: 0.6 },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...eventRows
      .filter((r) => !r.noindex)
      .map((r) => ({
        url: `${SITE_ORIGIN}/events/${r.slug}`,
        lastModified: r.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ...ministryRows
      .filter((r) => !r.noindex)
      .map((r) => ({
        url: `${SITE_ORIGIN}/ministries/${r.slug}`,
        lastModified: r.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ...formationRows
      .filter((r) => !r.noindex)
      .map((r) => ({
        url: `${SITE_ORIGIN}/formation/${r.slug}`,
        lastModified: r.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ...postRows
      .filter((r) => !r.noindex)
      .map((r) => ({
        url: `${SITE_ORIGIN}/blog/${r.slug}`,
        lastModified: r.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ...pageRows
      .filter((r) => !r.noindex)
      .map((r) => ({
        url: `${SITE_ORIGIN}/p/${r.slug}`,
        lastModified: r.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
  ];

  return [...staticRoutes, ...dynamicRoutes];
}
