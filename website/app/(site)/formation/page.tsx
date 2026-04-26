import Link from "next/link";
import { Container } from "@/components/site/Container";
import { InteriorHero } from "@/components/site/InteriorHero";
import { PhotoPlaceholder } from "@/components/site/PhotoPlaceholder";
import { resolveKeys } from "@/lib/blob";
import {
  FORMATION_CATEGORIES,
  getPublishedFormationPages,
} from "@/lib/queries/formation.query";
import type { FormationCategory } from "@/db/schema";

export const metadata = {
  title: "Faith Formation",
  description:
    "Religious education and faith-formation programs for kids, youth, adults, and families at Saint Helen.",
};
export const revalidate = 600;

const CATEGORY_LABEL: Record<FormationCategory, string> = {
  kids: "Kids",
  youth: "Youth",
  adults: "Adults",
  families: "Families",
};

export default async function FormationIndex({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const filter =
    category && (FORMATION_CATEGORIES as readonly string[]).includes(category)
      ? (category as FormationCategory)
      : undefined;

  const pages = await getPublishedFormationPages(filter);
  const photoUrls = await resolveKeys(pages.map((p) => p.photoBlobKey));

  return (
    <>
      <InteriorHero
        eyebrow="Faith Formation"
        title="Grow in faith, together."
        lede="Programs and learning communities for every age — from sacramental prep for kids to adult bible studies and family events."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Formation" }]}
        photoTone="warm"
      />

      <section className="bg-white pt-10 pb-24">
        <Container width="wide">
          <div className="mb-10 flex flex-wrap items-center gap-2">
            <Link
              href="/formation"
              className={
                "rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors " +
                (!filter
                  ? "bg-navy text-white"
                  : "border border-rule bg-white text-navy hover:border-navy")
              }
            >
              All
            </Link>
            {FORMATION_CATEGORIES.map((c) => (
              <Link
                key={c}
                href={`/formation?category=${c}`}
                className={
                  "rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors " +
                  (filter === c
                    ? "bg-navy text-white"
                    : "border border-rule bg-white text-navy hover:border-navy")
                }
              >
                {CATEGORY_LABEL[c]}
              </Link>
            ))}
          </div>

          {pages.length === 0 ? (
            <p className="rounded-lg border border-dashed border-rule bg-cream/40 px-6 py-12 text-center text-ink-3">
              {filter
                ? `No ${CATEGORY_LABEL[filter].toLowerCase()} programs published yet.`
                : "No formation pages published yet."}
            </p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pages.map((p) => {
                const imageUrl = p.photoBlobKey ? photoUrls.get(p.photoBlobKey) : null;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/formation/${p.slug}`}
                      className="group block overflow-hidden rounded-lg border border-rule bg-white transition-all hover:-translate-y-1 hover:shadow-hover"
                    >
                      <PhotoPlaceholder
                        imageUrl={imageUrl}
                        imageAlt={p.name}
                        label="Cover"
                        brief={p.name}
                        tone={p.category === "kids" || p.category === "families" ? "warm" : "navy"}
                        aspect="16/9"
                        className="rounded-none border-0"
                      />
                      <div className="p-6">
                        <span className="sh-eyebrow">{CATEGORY_LABEL[p.category]}</span>
                        <h2 className="mt-2 font-serif text-xl font-bold text-navy group-hover:text-rust-dark">
                          {p.name}
                        </h2>
                        {p.summary && (
                          <p className="mt-2 text-sm text-ink-2">{p.summary}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Container>
      </section>
    </>
  );
}
