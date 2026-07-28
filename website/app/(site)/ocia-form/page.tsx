import Link from "next/link";
import { Container } from "@/components/site/Container";
import { InteriorHero } from "@/components/site/InteriorHero";
import { OciaForm } from "@/components/forms/OciaForm";

export const dynamic = "force-static";

export const metadata = {
  title: "OCIA Inquirer Form",
  description:
    "Curious about becoming Catholic? Tell us a little about yourself and our OCIA team will walk with you — wherever you're starting from.",
};

export default function OciaFormPage() {
  return (
    <>
      <InteriorHero
        eyebrow="Become Catholic"
        title="OCIA Inquirer Form"
        lede="Wherever you're starting from — curious, searching, or ready — we'd love to walk with you. Tell us a little about yourself and someone from our OCIA team will be in touch."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Become Catholic", href: "/become-catholic" },
          { label: "Inquirer form" },
        ]}
        photoLabel="OCIA"
        photoBrief="Candidates and sponsors at the Easter Vigil"
        photoTone="warm"
      />
      <section className="bg-cream py-16 sm:py-24">
        <Container width="wide">
          <div className="mb-10 rounded-lg border border-rule bg-white p-6 text-sm text-ink-2">
            The Order of Christian Initiation of Adults (OCIA) is the Church&rsquo;s
            path for adults exploring the Catholic faith. There&rsquo;s no
            commitment in filling this out — it just helps us have a real
            conversation. Learn more on the{" "}
            <Link href="/become-catholic" className="font-semibold text-rust-dark hover:text-rust">
              Become Catholic
            </Link>{" "}
            page.
          </div>
          <OciaForm />
        </Container>
      </section>
    </>
  );
}
