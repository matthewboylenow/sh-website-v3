import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/Container";
import { PhotoPlaceholder } from "@/components/site/PhotoPlaceholder";
import { SectionRenderer } from "@/components/site/page-sections/SectionRenderer";
import { assetUrl } from "@/lib/blob";
import {
  getMinistryBySlug,
  getMinistrySections,
} from "@/lib/queries/ministries.query";
import { buildSectionContext } from "@/lib/section-resolve";
import { buildSeoMetadata } from "@/lib/seo";
import type { PageSectionPayload } from "@/db/schema";
import { MinistryInquiryForm } from "@/app/(site)/ministries/[slug]/MinistryInquiryForm";

/** Shared loader so /ministries/<slug> and the 12 root-URL standalones
 *  (/adoration, /music, /youth-ministry, …) render the same page. */

export async function buildMinistryMetadata(slug: string, path: string) {
  const data = await getMinistryBySlug(slug);
  if (!data) return { title: "Ministry not found" };
  return buildSeoMetadata({
    row: data.ministry,
    fallbackTitle: data.ministry.name,
    fallbackDescription: data.ministry.tagline ?? null,
    fallbackOgBlobKey: data.ministry.photoBlobKey,
    path,
  });
}

export async function renderMinistryPage(slug: string, opts: {
  /** When true (default), hero shows "Home / Ministries / Name". When false (root-standalone routes), shows "Home / Name". */
  showMinistriesCrumb?: boolean;
}) {
  const data = await getMinistryBySlug(slug);
  if (!data) notFound();

  const { ministry: m } = data;
  const [photoUrl, sectionRows] = await Promise.all([
    assetUrl(m.photoBlobKey),
    getMinistrySections(m.id),
  ]);
  const sections = sectionRows.map((r) => r.payload as PageSectionPayload);
  const sectionCtx = await buildSectionContext(sections, {
    kind: "ministry",
    id: m.id,
  });

  const showMinistriesCrumb = opts.showMinistriesCrumb ?? true;

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
                {showMinistriesCrumb && (
                  <>
                    <Link href="/ministries" className="hover:text-rust-dark">
                      Ministries
                    </Link>
                    <span aria-hidden="true" className="text-ink-4">/</span>
                  </>
                )}
                <span aria-current="page">{m.name}</span>
              </nav>

              {m.category && (
                <span className="sh-eyebrow capitalize">{m.category}</span>
              )}
              <h1 className="mt-3 text-[clamp(36px,4.4vw,56px)]">{m.name}</h1>
              {m.tagline && (
                <p className="sh-lede mt-4 max-w-[52ch]">{m.tagline}</p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#get-involved"
                  className="inline-flex items-center rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark"
                >
                  Get involved
                </a>
                <Link
                  href="/ministries"
                  className="inline-flex items-center rounded-pill border border-rule bg-white px-6 py-3 text-sm font-semibold text-navy transition-colors hover:border-navy"
                >
                  All ministries
                </Link>
              </div>
            </div>

            <PhotoPlaceholder
              imageUrl={photoUrl}
              imageAlt={`${m.name} at Saint Helen`}
              label="Ministry photo"
              brief={`${m.name} in action — real members, candid moments.`}
              tone="warm"
              aspect="5/4"
              priority
            />
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container width="wide">
          <div
            className={
              m.meetingCadence
                ? "grid gap-12 md:grid-cols-[2fr_1fr]"
                : "max-w-3xl"
            }
          >
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

            {m.meetingCadence && (
              <aside className="space-y-5 self-start rounded-lg border border-rule bg-cream p-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
                    Meeting cadence
                  </h3>
                  <p className="mt-1 font-serif text-base font-bold text-navy">
                    {m.meetingCadence}
                  </p>
                </div>
              </aside>
            )}
          </div>

          {m.inquiryConfig?.enabled &&
            m.inquiryConfig.buttons.some((b) => b.enabled) && (
              <div id="get-involved" className="mt-16 scroll-mt-24">
                <MinistryInquiryForm
                  slug={m.slug}
                  ministryName={m.name}
                  config={m.inquiryConfig}
                />
              </div>
            )}
        </Container>
      </section>
    </>
  );
}

/** The 12 ministries that live at root URLs (/adoration, /music, …)
 *  instead of /ministries/<slug>. Source of truth for adding root routes
 *  + emitting standalone-redirect manifest entries. */
export const STANDALONE_SLUGS = [
  "adoration",
  "basketball",
  "called",
  "christlife",
  "grow",
  "lifelines",
  "music",
  "pre-cana",
  "vbs",
  "wwp",
  "young-adult-ministry",
  "youth-ministry",
] as const;

export type StandaloneSlug = (typeof STANDALONE_SLUGS)[number];
