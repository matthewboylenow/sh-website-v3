import type { Metadata } from "next";
import { assetUrl } from "@/lib/blob";
import { htmlToPlainText } from "@/lib/sanitize";

/**
 * Per-row SEO override fields. Every public content type stores these
 * in the same shape so generateMetadata() helpers can stay generic.
 */
export type SeoRow = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageBlobKey?: string | null;
  noindex?: boolean | null;
  canonicalUrl?: string | null;
};

/** Best-effort canonical site origin. Used for absolute OG URLs. */
export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://sainthelen.org";

/**
 * Compose Next.js Metadata from a content row + sensible fallbacks.
 *
 *   const meta = await buildSeoMetadata({
 *     row: event,                                      // SeoRow shape
 *     fallbackTitle: event.title,
 *     fallbackDescription: event.lede,
 *     fallbackOgBlobKey: event.photoBlobKey,
 *     path: `/events/${event.slug}`,
 *   });
 *
 * Truncation: titles cap at 60 chars, descriptions at 160. Plain-text
 * conversion handles HTML inputs (e.g. body fields).
 */
export async function buildSeoMetadata({
  row,
  fallbackTitle,
  fallbackDescription,
  fallbackOgBlobKey,
  path,
}: {
  row: SeoRow;
  fallbackTitle: string;
  fallbackDescription?: string | null;
  fallbackOgBlobKey?: string | null;
  /** Path beginning with "/" — used for canonical URL when none is set. */
  path: string;
}): Promise<Metadata> {
  const title = (row.metaTitle?.trim() || fallbackTitle).slice(0, 60);
  const rawDesc =
    row.metaDescription?.trim() ||
    (fallbackDescription ? htmlToPlainText(fallbackDescription).trim() : "");
  const description = rawDesc ? rawDesc.slice(0, 160) : undefined;

  const ogKey = row.ogImageBlobKey ?? fallbackOgBlobKey ?? null;
  const ogImage = await assetUrl(ogKey);

  const canonicalRel = row.canonicalUrl?.trim() || path;
  const canonical = canonicalRel.startsWith("http")
    ? canonicalRel
    : `${SITE_ORIGIN}${canonicalRel}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: row.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}
