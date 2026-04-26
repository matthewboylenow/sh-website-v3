import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/Container";
import { PhotoPlaceholder } from "@/components/site/PhotoPlaceholder";
import { SectionRenderer } from "@/components/site/page-sections/SectionRenderer";
import { assetUrl } from "@/lib/blob";
import { getFormationBySlug } from "@/lib/queries/formation.query";
import { getPageSections } from "@/lib/queries/ministries.query";
import { buildSectionContext } from "@/lib/section-resolve";
import type { FormationCategory, PageSectionPayload } from "@/db/schema";

export const revalidate = 600;

const CATEGORY_LABEL: Record<FormationCategory, string> = {
  kids: "Kids",
  youth: "Youth",
  adults: "Adults",
  families: "Families",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getFormationBySlug(slug);
  if (!data) return { title: "Page not found" };
  return {
    title: data.page.name,
    description: data.page.summary ?? undefined,
  };
}

export default async function FormationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getFormationBySlug(slug);
  if (!data) notFound();

  const p = data.page;
  const [photoUrl, sectionRows] = await Promise.all([
    assetUrl(p.photoBlobKey),
    getPageSections("formation", p.id),
  ]);
  const sections = sectionRows.map((r) => r.payload as PageSectionPayload);
  const sectionCtx = await buildSectionContext(sections, {
    kind: "formation",
    id: p.id,
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
                <Link href="/" className="hover:text-rust-dark">Home</Link>
                <span aria-hidden="true" className="text-ink-4">/</span>
                <Link href="/formation" className="hover:text-rust-dark">Formation</Link>
                <span aria-hidden="true" className="text-ink-4">/</span>
                <span aria-current="page">{p.name}</span>
              </nav>

              <span className="sh-eyebrow">{CATEGORY_LABEL[p.category]}</span>
              <h1 className="mt-3 text-[clamp(36px,4.4vw,56px)]">{p.name}</h1>
              {p.summary && <p className="sh-lede mt-4 max-w-[52ch]">{p.summary}</p>}
            </div>

            <PhotoPlaceholder
              imageUrl={photoUrl}
              imageAlt={`${p.name} at Saint Helen`}
              label="Program photo"
              brief={`${p.name} in action.`}
              tone="warm"
              aspect="5/4"
              priority
            />
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container width="wide">
          <div className="grid gap-12 md:grid-cols-[2fr_1fr]">
            <article className="max-w-none">
              {sections.length > 0 ? (
                <div className="space-y-12">
                  {sections.map((s, i) => (
                    <SectionRenderer key={i} payload={s} ctx={sectionCtx} />
                  ))}
                </div>
              ) : (
                <p className="text-ink-3">Content coming soon.</p>
              )}
            </article>

            <aside className="space-y-5 self-start rounded-lg border border-rule bg-cream p-6">
              {p.contactEmail && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
                    Contact
                  </h3>
                  <p className="mt-1 font-mono text-sm">
                    <a
                      href={`mailto:${encodeURIComponent(p.contactEmail)}`}
                      className="text-rust-dark hover:text-rust"
                    >
                      {p.contactEmail}
                    </a>
                  </p>
                </div>
              )}
              {data.leadStaff?.id && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
                    Lead
                  </h3>
                  <p className="mt-1 font-serif text-base font-bold text-navy">
                    {data.leadStaff.name}
                  </p>
                  {data.leadStaff.role && (
                    <p className="text-xs text-ink-3">{data.leadStaff.role}</p>
                  )}
                </div>
              )}
            </aside>
          </div>

        </Container>
      </section>
    </>
  );
}
