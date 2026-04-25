import Link from "next/link";
import { Container } from "@/components/site/Container";
import { InteriorHero } from "@/components/site/InteriorHero";
import { Matchmaker } from "@/components/ministries/Matchmaker";
import { MinistryCard } from "@/components/site/MinistryCard";
import { SectionHead } from "@/components/site/SectionHead";
import { resolveKeys } from "@/lib/blob";
import {
  getMinistryCategoriesInUse,
  getPublishedMinistries,
} from "@/lib/queries/ministries.query";
import { getSiteSettings } from "@/lib/queries/site-settings.query";

export const metadata = {
  title: "Ministries",
  description:
    "Every ministry at Saint Helen — from contemplative prayer to hands-on outreach. Find your fit.",
};

export const revalidate = 3600;

export default async function MinistriesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const filter = params.category && params.category !== "all" ? params.category : null;

  const [all, categoriesInUse, settings] = await Promise.all([
    getPublishedMinistries(),
    getMinistryCategoriesInUse(),
    getSiteSettings(),
  ]);

  const filtered = filter
    ? all.filter((m) => m.category === filter)
    : all;

  const photoUrls = await resolveKeys(filtered.map((m) => m.photoBlobKey));

  return (
    <>
      <InteriorHero
        eyebrow="Find your place"
        title="Ministries."
        lede="Every ministry at Saint Helen — from contemplative prayer to hands-on outreach. Take 60 seconds with the Matchmaker, or browse them all."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Ministries" }]}
        photoLabel="Garden ministry"
        photoBrief="Real members on a workday — gloves, sunlight, parish grounds."
        photoTone="warm"
      />

      {/* ---- Matchmaker CTA --------------------------------------- */}
      <section className="bg-navy py-16 text-white">
        <Container width="default" className="text-center">
          <span className="sh-eyebrow text-gold">60-second quiz</span>
          <h2 className="mt-2 text-white">Not sure where to start?</h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-white/85">
            Three quick questions and we&rsquo;ll surface the ministries most
            likely to fit. No commitment — just a starting point.
          </p>
          <div className="mt-6">
            <Matchmaker
              manifest={settings?.matchmaker ?? { questions: [] }}
              triggerLabel="Open the matchmaker"
            />
          </div>
        </Container>
      </section>

      {/* ---- All ministries with category filter ------------------ */}
      <section className="bg-cream py-20">
        <Container width="wide">
          <SectionHead eyebrow="Browse" title="All ministries" />

          {categoriesInUse.length > 0 && (
            <nav
              aria-label="Filter by category"
              className="mt-8 flex flex-wrap gap-2"
            >
              <CategoryChip
                href="/ministries"
                label="All"
                active={filter === null}
                count={all.length}
              />
              {categoriesInUse.map((cat) => (
                <CategoryChip
                  key={cat}
                  href={`/ministries?category=${cat}`}
                  label={cat}
                  active={filter === cat}
                  count={all.filter((m) => m.category === cat).length}
                />
              ))}
            </nav>
          )}

          {filtered.length === 0 ? (
            <div className="mt-12 rounded-lg border border-dashed border-rule bg-white p-12 text-center">
              <p className="font-serif text-lg font-bold text-navy">
                Nothing matches that filter.
              </p>
              <p className="mt-2 text-sm text-ink-2">
                Try a different category, or{" "}
                <Link href="/ministries" className="font-semibold text-rust-dark">
                  view all
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m) => (
                <MinistryCard
                  key={m.slug}
                  ministry={m}
                  tone="on-cream"
                  imageUrl={m.photoBlobKey ? photoUrls.get(m.photoBlobKey) : null}
                />
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

function CategoryChip({
  href,
  label,
  active,
  count,
}: {
  href: string;
  label: string;
  active: boolean;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold capitalize transition-colors ${
        active
          ? "bg-navy text-white"
          : "border border-rule bg-white text-ink-2 hover:border-navy"
      }`}
    >
      {label}
      <span className={`text-xs ${active ? "text-white/70" : "text-ink-3"}`}>
        {count}
      </span>
    </Link>
  );
}
