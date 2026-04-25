import { Container } from "@/components/site/Container";
import { InteriorHero } from "@/components/site/InteriorHero";
import { BulletinList, type BulletinRow } from "@/components/bulletins/BulletinList";
import { resolveKeys } from "@/lib/blob";
import { getPublishedBulletins } from "@/lib/queries/bulletins.query";
import { toDate } from "@/lib/dates";

export const metadata = {
  title: "Bulletin",
  description:
    "The weekly Saint Helen bulletin — current week and recent archive. Open any bulletin to read it in-page or download the PDF.",
};

export const revalidate = 600;

export default async function BulletinPage() {
  const bulletins = await getPublishedBulletins(60);
  const pdfUrls = await resolveKeys(bulletins.map((b) => b.pdfBlobKey));

  const rows: BulletinRow[] = bulletins.map((b) => ({
    id: b.id,
    weekOf: typeof b.weekOf === "string" ? b.weekOf : toDate(b.weekOf).toISOString().slice(0, 10),
    title: b.title,
    pageCount: b.pageCount,
    pdfUrl: pdfUrls.get(b.pdfBlobKey) ?? null,
  }));

  const latest = rows[0];

  return (
    <>
      <InteriorHero
        eyebrow={latest ? "Most recent · this week" : "Bulletin"}
        title={latest?.title ?? "The Weekly Bulletin"}
        lede="Pick any week to read in-page or download the PDF. The latest goes live each Saturday for the upcoming Sunday."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bulletin" }]}
        photoLabel="Bulletin"
        photoBrief="Open bulletin on a parishioner's lap — Sunday morning, soft light."
        photoTone="warm"
      />

      <section className="bg-cream py-16">
        <Container width="default">
          <BulletinList bulletins={rows} />
          <p className="mt-6 text-xs text-ink-3">
            Need a bulletin from before the digital archive? Email{" "}
            <a
              href="mailto:parish@sainthelen.org"
              className="font-semibold text-rust-dark hover:text-rust"
            >
              parish@sainthelen.org
            </a>
            .
          </p>
        </Container>
      </section>
    </>
  );
}
