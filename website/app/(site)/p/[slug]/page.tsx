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

const getPage = unstable_cache(
  async (slug: string) => {
    const [row] = await db
      .select()
      .from(pages)
      .where(and(eq(pages.slug, slug), eq(pages.status, "published")))
      .limit(1);
    if (!row) return null;
    const sectionRows = await db
      .select({
        id: pageSections.id,
        payload: pageSections.payload,
      })
      .from(pageSections)
      .where(
        and(
          eq(pageSections.parentKind, "page"),
          eq(pageSections.parentId, row.id),
        ),
      )
      .orderBy(asc(pageSections.position));
    return { page: row, sections: sectionRows };
  },
  ["pages:by-slug"],
  { tags: ["pages", "page-sections"], revalidate: 600 },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPage(slug);
  if (!data) return { title: "Page not found" };
  return buildSeoMetadata({
    row: data.page,
    fallbackTitle: data.page.title,
    fallbackDescription: data.page.summary ?? null,
    fallbackOgBlobKey: data.page.photoBlobKey,
    path: `/p/${data.page.slug}`,
  });
}

export default async function GenericCmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPage(slug);
  if (!data) notFound();

  const photoUrl = await assetUrl(data.page.photoBlobKey);
  const sections = data.sections.map(
    (r) => r.payload as PageSectionPayload,
  );
  const sectionCtx = await buildSectionContext(sections, {
    kind: "page",
    id: data.page.id,
  });

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
                <span aria-hidden="true" className="text-ink-4">/</span>
                <span aria-current="page">{data.page.title}</span>
              </nav>
              <h1 className="text-[clamp(36px,4.4vw,56px)]">{data.page.title}</h1>
              {data.page.summary && (
                <p className="sh-lede mt-4 max-w-[52ch]">{data.page.summary}</p>
              )}
            </div>
            <PhotoPlaceholder
              imageUrl={photoUrl}
              imageAlt={data.page.title}
              label="Page hero"
              brief={data.page.title}
              tone="warm"
              aspect="5/4"
              priority
            />
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container width="wide">
          {sections.length > 0 ? (
            <div className="space-y-12">
              {sections.map((s, i) => (
                <SectionRenderer key={i} payload={s} ctx={sectionCtx} />
              ))}
            </div>
          ) : (
            <p className="text-ink-3">Content coming soon.</p>
          )}
        </Container>
      </section>
    </>
  );
}
