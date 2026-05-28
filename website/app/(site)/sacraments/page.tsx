import Link from "next/link";
import Image from "next/image";
import { and, asc, eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { Container } from "@/components/site/Container";
import { PhotoPlaceholder } from "@/components/site/PhotoPlaceholder";
import { db } from "@/db";
import { pages, blobAssets } from "@/db/schema";
import { resolveAssetUrl } from "@/lib/blob";

export const revalidate = 600;
export const metadata = {
  title: "Sacraments | Saint Helen",
  description:
    "The seven sacraments at Saint Helen — Baptism, Eucharist, Confirmation, Reconciliation, Anointing of the Sick, Marriage, and Holy Orders.",
};

const SACRAMENT_ORDER = [
  "baptism",
  "eucharist",
  "confirmation",
  "reconciliation",
  "anointing-of-the-sick",
  "marriage",
  "holy-orders",
];

const getSacraments = unstable_cache(
  async () => {
    const slugs = SACRAMENT_ORDER.map((s) => `sacraments-${s}`);
    const rows = await db
      .select({
        slug: pages.slug,
        title: pages.title,
        summary: pages.summary,
        photoBlobKey: pages.photoBlobKey,
      })
      .from(pages)
      .where(and(inArray(pages.slug, slugs), eq(pages.status, "published")))
      .orderBy(asc(pages.title));
    const keys = rows.map((r) => r.photoBlobKey).filter(Boolean) as string[];
    const photos = keys.length
      ? await db
          .select({ key: blobAssets.key, url: blobAssets.blobUrl })
          .from(blobAssets)
          .where(inArray(blobAssets.key, keys))
      : [];
    const urlByKey = new Map(photos.map((p) => [p.key, resolveAssetUrl(p.url)]));
    return rows
      .map((r) => ({
        ...r,
        publicSlug: r.slug.replace(/^sacraments-/, ""),
        photoUrl: r.photoBlobKey ? urlByKey.get(r.photoBlobKey) ?? null : null,
      }))
      .sort(
        (a, b) =>
          SACRAMENT_ORDER.indexOf(a.publicSlug) -
          SACRAMENT_ORDER.indexOf(b.publicSlug),
      );
  },
  ["sacraments:index"],
  { tags: ["pages"], revalidate: 600 },
);

export default async function SacramentsIndex() {
  const list = await getSacraments();

  return (
    <>
      <section className="bg-cream pt-28 pb-12 sm:pt-32 sm:pb-16">
        <Container width="wide">
          <span className="sh-eyebrow">Sacraments</span>
          <h1 className="mt-3 text-[clamp(36px,4.4vw,56px)]">
            The seven sacraments at Saint Helen
          </h1>
          <p className="sh-lede mt-4 max-w-[58ch]">
            The sacraments are encounters with Christ &mdash; visible signs of God&rsquo;s
            grace at every major step of the Christian life. Saint Helen
            celebrates all seven.
          </p>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container width="wide">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => (
              <Link
                key={s.slug}
                href={`/sacraments/${s.publicSlug}`}
                className="group flex flex-col overflow-hidden rounded-lg border border-rule bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="aspect-[5/4] w-full overflow-hidden bg-cream">
                  {s.photoUrl ? (
                    <Image
                      src={s.photoUrl}
                      alt=""
                      width={600}
                      height={480}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <PhotoPlaceholder
                      imageUrl={null}
                      imageAlt=""
                      label={s.title}
                      brief={s.title}
                      tone="warm"
                      aspect="5/4"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h2 className="font-serif text-xl font-bold text-navy group-hover:text-rust-dark">
                    {s.title.replace(/ at Saint Helen$/i, "")}
                  </h2>
                  {s.summary && (
                    <p className="text-sm text-ink-2 line-clamp-3">{s.summary}</p>
                  )}
                  <span className="mt-auto text-sm font-semibold text-rust-dark">
                    Learn more &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
