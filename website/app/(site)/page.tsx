import Link from "next/link";
import { Container } from "@/components/site/Container";
import { HeroVideo } from "@/components/site/HeroVideo";
import { SectionRenderer } from "@/components/site/page-sections/SectionRenderer";
import { getWeeklyMassTimes } from "@/lib/queries/mass-times.query";
import { getPageSections } from "@/lib/queries/ministries.query";
import { getActiveSeasonalBanner } from "@/lib/queries/seasonal-banners.query";
import { getSiteSettings } from "@/lib/queries/site-settings.query";
import { buildSectionContext } from "@/lib/section-resolve";
import { DEFAULT_HOMEPAGE_HERO, type PageSectionPayload } from "@/db/schema";
import { HOMEPAGE_PARENT_ID } from "@/app/(admin)/admin/homepage/constants";

export const revalidate = 3600;

export default async function HomePage() {
  const [banner, weeklyMassTimes, settings, sectionRows] = await Promise.all([
    getActiveSeasonalBanner(),
    getWeeklyMassTimes(),
    getSiteSettings(),
    getPageSections("homepage", HOMEPAGE_PARENT_ID),
  ]);

  const hero = settings?.homepageHero ?? DEFAULT_HOMEPAGE_HERO;
  const sections = sectionRows.map((r) => r.payload as PageSectionPayload);
  const sectionCtx = await buildSectionContext(sections);

  // Mass-times peek — auto-pulled from the schedule, only if hero opted in.
  const sundayMasses = weeklyMassTimes.filter((m) => m.dayOfWeek === 0);
  const vigilMasses = weeklyMassTimes.filter(
    (m) => m.dayOfWeek === 6 && m.kind === "vigil",
  );
  const heroMassPeek = [...vigilMasses, ...sundayMasses].slice(0, 3);

  return (
    <>
      {/* ---- Hero ------------------------------------------------- */}
      <HeroVideo videoUrl={hero.videoUrl} posterUrl={hero.posterUrl}>
        <Container width="wide">
          <div className="sh-on-dark flex min-h-[640px] flex-col justify-center pt-32 pb-20 sm:min-h-[720px] sm:pt-40">
            <div className="max-w-[40ch]">
              {hero.eyebrow && <span className="sh-eyebrow">{hero.eyebrow}</span>}
              <h1 className="sh-display mt-4">{hero.title}</h1>
              {hero.lede && <p className="sh-lede mt-6 max-w-[48ch]">{hero.lede}</p>}

              {hero.ctas.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {hero.ctas.map((cta, i) => {
                    const isExternal = /^https?:\/\//.test(cta.href);
                    const cls =
                      cta.variant === "primary"
                        ? "inline-flex items-center gap-2 rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark"
                        : "inline-flex items-center rounded-pill border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20";
                    return isExternal ? (
                      <a
                        key={i}
                        href={cta.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cls}
                      >
                        {cta.label}
                        {cta.variant === "primary" && (
                          <span aria-hidden="true">→</span>
                        )}
                      </a>
                    ) : (
                      <Link key={i} href={cta.href} className={cls}>
                        {cta.label}
                        {cta.variant === "primary" && (
                          <span aria-hidden="true">→</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {hero.massPeek.enabled && heroMassPeek.length > 0 && (
                <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
                  {hero.massPeek.eyebrow && (
                    <span className="sh-eyebrow">{hero.massPeek.eyebrow}</span>
                  )}
                  {heroMassPeek.map((m) => (
                    <span
                      key={m.id}
                      className="font-serif text-base font-bold text-white"
                    >
                      {formatMassTime(m.time)}
                    </span>
                  ))}
                  {hero.massPeek.linkLabel && hero.massPeek.linkHref && (
                    <Link
                      href={hero.massPeek.linkHref}
                      className="text-xs font-semibold text-gold hover:text-white"
                    >
                      {hero.massPeek.linkLabel}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </Container>
      </HeroVideo>

      {/* ---- Seasonal banner (only when active) ------------------- */}
      {banner && (
        <section className="bg-white pt-0 pb-8">
          <Container width="wide">
            <Link
              href={banner.ctaUrl ?? "#"}
              className="group flex flex-col gap-6 overflow-hidden rounded-lg border border-rule bg-gradient-to-br from-gold/20 via-cream to-rust-pale p-8 shadow-md transition-all hover:-translate-y-1 hover:shadow-hover md:flex-row md:items-center"
            >
              <div className="flex-1">
                <span className="sh-eyebrow">Seasonal</span>
                <h3 className="mt-2 font-serif text-2xl font-bold text-navy">
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="mt-2 text-ink-2">{banner.subtitle}</p>
                )}
              </div>
              {banner.ctaLabel && (
                <span className="inline-flex items-center gap-2 font-semibold text-rust-dark">
                  {banner.ctaLabel} <span aria-hidden="true">→</span>
                </span>
              )}
            </Link>
          </Container>
        </section>
      )}

      {/* ---- CMS sections — edited via /admin/homepage ----------- */}
      {sections.length > 0 && (
        <div className="space-y-16 py-16">
          {sections.map((s, i) => (
            <Container key={i} width="wide">
              <SectionRenderer payload={s} ctx={sectionCtx} />
            </Container>
          ))}
        </div>
      )}
    </>
  );
}

/* ---- Formatting helpers ---- */

function formatMassTime(timeStr: string): string {
  // timeStr is "HH:MM:SS" from Postgres time column
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0
    ? `${h12} ${period}`
    : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

