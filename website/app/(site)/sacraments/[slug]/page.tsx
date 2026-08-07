import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Container } from "@/components/site/Container";
import { PhotoPlaceholder } from "@/components/site/PhotoPlaceholder";
import { SectionRenderer } from "@/components/site/page-sections/SectionRenderer";
import { db } from "@/db";
import { pages, pageSections, type PageSectionPayload } from "@/db/schema";
import { assetUrl } from "@/lib/blob";
import { buildSectionContext } from "@/lib/section-resolve";
import { buildSeoMetadata } from "@/lib/seo";

export const revalidate = 600;

/**
 * Sacrament detail page. Slugs in the URL (`/sacraments/baptism`) map
 * to rows in the polymorphic `pages` table keyed `sacraments-<slug>`,
 * with their `canonicalUrl` set to the public path so search engines
 * favor `/sacraments/baptism` over the redundant `/p/sacraments-baptism`
 * route the same data also resolves through.
 */
const getSacrament = unstable_cache(
  async (slug: string) => {
    const [row] = await db
      .select()
      .from(pages)
      .where(and(eq(pages.slug, `sacraments-${slug}`), eq(pages.status, "published")))
      .limit(1);
    if (!row) return null;
    const sectionRows = await db
      .select({ id: pageSections.id, payload: pageSections.payload })
      .from(pageSections)
      .where(and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, row.id)))
      .orderBy(asc(pageSections.position));
    return { page: row, sections: sectionRows };
  },
  ["sacraments:by-slug"],
  { tags: ["pages", "page-sections"], revalidate: 600 },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getSacrament(slug);
  if (!data) return { title: "Sacrament not found" };
  return buildSeoMetadata({
    row: data.page,
    fallbackTitle: data.page.title,
    fallbackDescription: data.page.summary ?? null,
    fallbackOgBlobKey: data.page.photoBlobKey,
    path: `/sacraments/${slug}`,
  });
}

  const WIDE_KINDS = new Set([
    "card_grid",
    "image_gallery",
    "columns",
    "callout_banner",
    "embed",
    "video",
    "featured_ministries",
    "featured_events",
  ]);

export default async function SacramentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getSacrament(slug);
  if (!data) notFound();

  const { page: p, sections: sectionRows } = data;
  const [photoUrl] = await Promise.all([assetUrl(p.photoBlobKey)]);
  const sections = sectionRows.map((r) => r.payload as PageSectionPayload);
  const sectionCtx = await buildSectionContext(sections, { kind: "page", id: p.id });

  return (
    <>
      <section className="bg-cream pt-28 pb-16 sm:pt-32 sm:pb-20">
        <Container width="wide">
          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <nav
                aria-label="Breadcrumb"
                className="mb-4 flex flex-wrap items-center gap-x-2 text-xs text-ink-3"
              >
                <Link href="/" className="hover:text-rust-dark">
                  Home
                </Link>
                <span aria-hidden="true" className="text-ink-4">
                  /
                </span>
                <Link href="/sacraments" className="hover:text-rust-dark">
                  Sacraments
                </Link>
                <span aria-hidden="true" className="text-ink-4">
                  /
                </span>
                <span aria-current="page">{p.title}</span>
              </nav>

              <span className="sh-eyebrow">Sacrament</span>
              <h1 className="mt-3 text-[clamp(36px,4.4vw,56px)]">{p.title}</h1>
              {p.summary && (
                <p className="sh-lede mt-4 max-w-[52ch]">{p.summary}</p>
              )}
            </div>

            <PhotoPlaceholder
              imageUrl={photoUrl}
              imageAlt={p.title}
              label="Sacrament photo"
              brief={`${p.title} at Saint Helen — liturgical moment, real parishioners.`}
              tone="warm"
              aspect="5/4"
              priority
            />
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container width="wide">
          <article className="max-w-3xl">
            {sections.length > 0 ? (
              <div className="space-y-10">
                {sections.map((s, i) => (
                  <div key={i} className={WIDE_KINDS.has(s.kind) ? undefined : "max-w-[70ch]"}><SectionRenderer payload={s} ctx={sectionCtx} /></div>
                ))}
              </div>
            ) : (
              <p className="text-ink-3">Content coming soon.</p>
            )}
          </article>
        </Container>
      </section>
    </>
  );
}
