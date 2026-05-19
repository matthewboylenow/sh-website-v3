import { Container } from "@/components/site/Container";
import { InteriorHero } from "@/components/site/InteriorHero";
import { BaptismForm } from "@/components/forms/BaptismForm";

export const metadata = {
  title: "Baptism Intake — Saint Helen",
  description:
    "Begin the baptism intake for your child at the Parish Community of Saint Helen. Our staff will follow up to schedule baptism prep and confirm the date.",
};

export const dynamic = "force-static";

export default function BaptismPage() {
  return (
    <>
      <InteriorHero
        eyebrow="A new beginning"
        title="Baptism intake form."
        lede="Baptism celebrates your child's entrance into the Church, becoming an adopted son or daughter of God our Father. Infant baptisms are celebrated twice monthly at Saint Helen."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Baptism" }]}
        photoLabel="Baptismal font, gentle light"
        photoBrief="Font · candle · white robe · the sacrament's quiet joy."
        photoTone="cream"
      />

      <section className="bg-cream py-16 sm:py-24">
        <Container width="wide">
          <div className="mb-8 rounded-lg border border-rule bg-white p-6 text-sm leading-relaxed text-ink-2 sm:p-8">
            <p className="font-serif text-lg font-bold text-navy">
              Before you begin
            </p>
            <p className="mt-2">
              Please complete the intake form below. Fields marked{" "}
              <span className="font-semibold text-rust">*</span> are required.
              After you submit, our parish staff will follow up by email to
              schedule a baptism preparation session and confirm the date of
              the celebration.
            </p>
          </div>

          <BaptismForm />
        </Container>
      </section>
    </>
  );
}
