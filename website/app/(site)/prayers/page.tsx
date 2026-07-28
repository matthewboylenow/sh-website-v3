import { and, asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { Container } from "@/components/site/Container";
import { SectionRenderer } from "@/components/site/page-sections/SectionRenderer";
import { PrayerRequestForm } from "@/components/forms/PrayerRequestForm";
import { db } from "@/db";
import { pages, pageSections, type PageSectionPayload } from "@/db/schema";
import { buildSectionContext } from "@/lib/section-resolve";
import { buildSeoMetadata } from "@/lib/seo";

export const revalidate = 600;

/**
 * Dedicated /prayers route: renders the admin-editable "prayers" CMS page
 * (same content pipeline as app/(site)/[slug]) with the prayer-request
 * form appended — matching the legacy WP page, which embedded the
 * FluentForms "Prayer Requests" form below the prayer content. The static
 * segment wins over [slug], so the CMS page stays editable in
 * /admin/pages and this route picks the content up automatically.
 */
const getPrayersPage = unstable_cache(
  async () => {
    const [row] = await db
      .select()
      .from(pages)
      .where(and(eq(pages.slug, "prayers"), eq(pages.status, "published")))
      .limit(1);
    if (!row) return null;
    const sectionRows = await db
      .select({ id: pageSections.id, payload: pageSections.payload })
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
  ["prayers:page"],
  { tags: ["pages", "page-sections"], revalidate: 600 },
);

const FALLBACK_DESCRIPTION =
  "Submit a prayer request to the Saint Helen prayer team, and explore prayers for every season of life.";

export async function generateMetadata() {
  const data = await getPrayersPage();
  if (!data) {
    return { title: "Prayers & Prayer Requests", description: FALLBACK_DESCRIPTION };
  }
  return buildSeoMetadata({
    row: data.page,
    fallbackTitle: data.page.title || "Prayers & Prayer Requests",
    fallbackDescription: data.page.summary ?? FALLBACK_DESCRIPTION,
    fallbackOgBlobKey: data.page.photoBlobKey,
    path: "/prayers",
  });
}

export default async function PrayersPage() {
  const data = await getPrayersPage();
  const sections = (data?.sections ?? []).map(
    (r) => r.payload as PageSectionPayload,
  );
  const sectionCtx = await buildSectionContext(
    sections,
    data ? { kind: "page", id: data.page.id } : undefined,
  );

  return (
    <>
      <section className="bg-cream pt-28 pb-16 sm:pt-32 sm:pb-20">
        <Container width="wide">
          <span className="sh-eyebrow">Prayer</span>
          <h1 className="mt-3 text-[clamp(36px,4.4vw,56px)]">
            {data?.page.title ?? "Prayers"}
          </h1>
          {data?.page.summary && (
            <p className="sh-lede mt-4 max-w-[52ch]">{data.page.summary}</p>
          )}
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container width="wide">
          {sections.length > 0 && (
            <div className="space-y-12">
              {sections.map((s, i) => (
                <SectionRenderer key={i} payload={s} ctx={sectionCtx} />
              ))}
            </div>
          )}

          <div id="prayer-request" className="mt-16 scroll-mt-24">
            <div className="mb-8 max-w-[60ch]">
              <span className="sh-eyebrow">We&rsquo;ll pray with you</span>
              <h2 className="mt-2 font-serif text-3xl font-bold text-navy">
                Submit a prayer request
              </h2>
              <p className="mt-3 text-sm text-ink-2">
                Share your intention below and our prayer team will hold it in
                prayer. Requests go directly to the team — they are not
                published anywhere.
              </p>
            </div>
            <div className="max-w-2xl">
              <PrayerRequestForm />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
