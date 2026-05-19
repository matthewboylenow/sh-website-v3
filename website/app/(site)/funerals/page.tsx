import { Container } from "@/components/site/Container";
import { InteriorHero } from "@/components/site/InteriorHero";
import { FuneralForm } from "@/components/forms/FuneralForm";

export const metadata = {
  title: "Funeral Intake — Saint Helen",
  description:
    "Begin the funeral arrangements for a loved one at the Parish Community of Saint Helen. Father will follow up with you to confirm the details.",
};

export const dynamic = "force-static";

export default function FuneralsPage() {
  return (
    <>
      <InteriorHero
        eyebrow="In your time of loss"
        title="Funeral intake form."
        lede="During this time of sadness, please be assured of the prayers of our parish community for you and your family. Complete what you can — Father will reach out to fill in the rest."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Funerals" }]}
        photoLabel="Sanctuary, candles lit"
        photoBrief="Warm, low light · pews · ambo · the abiding peace of the church."
        photoTone="warm"
      />

      <section className="bg-cream py-16 sm:py-24">
        <Container width="wide">
          <div className="mb-8 grid gap-4 rounded-lg border border-rule bg-white p-6 text-sm leading-relaxed text-ink-2 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-serif text-lg font-bold text-navy">
                Before you begin
              </p>
              <p className="mt-2">
                If you&rsquo;d like to review the Scripture readings or
                intercession options first, our parish PDFs are linked here.
                Fields marked <span className="font-semibold text-rust">*</span>{" "}
                are required; everything else is optional and can be filled in
                later.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://sainthelen.org/wp-content/uploads/2020/02/Funeral-Readings.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-pill border border-navy/20 bg-white px-4 py-2 text-xs font-semibold text-navy hover:border-rust hover:text-rust-dark"
              >
                Funeral Readings PDF →
              </a>
              <a
                href="https://sainthelen.org/wp-content/uploads/2020/02/Funeral-Intercessions.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-pill border border-navy/20 bg-white px-4 py-2 text-xs font-semibold text-navy hover:border-rust hover:text-rust-dark"
              >
                Funeral Intercessions PDF →
              </a>
            </div>
          </div>

          <FuneralForm />
        </Container>
      </section>
    </>
  );
}
