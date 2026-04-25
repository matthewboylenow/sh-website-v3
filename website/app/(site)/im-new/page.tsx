import { Container } from "@/components/site/Container";
import { InteriorHero } from "@/components/site/InteriorHero";
import { SectionHead } from "@/components/site/SectionHead";
import { ServeTile } from "@/components/site/ServeTile";
import { WelcomeForm } from "@/components/forms/WelcomeForm";
import { getSiteSettings } from "@/lib/queries/site-settings.query";

export const metadata = {
  title: "Plan Your Visit",
  description:
    "Everything you need to know before Sunday — where to park, what to wear, what to expect, and how to meet us once you're here.",
};

export const revalidate = 3600;

const STEPS = [
  {
    n: "01",
    title: "Pick a Mass",
    body:
      "Saturday Vigil at 5 PM, and Sunday at 7:30, 9, 10:30 (Family), and 12. All Masses are welcome to everyone.",
  },
  {
    n: "02",
    title: "Come as you are",
    body:
      "No dress code. Arrive 10 minutes early and our greeters will show you around. Restrooms, cry room, and family seating are clearly marked.",
  },
  {
    n: "03",
    title: "Stay for coffee",
    body:
      "After the 10:30 Family Mass, join us in the parish hall for coffee and donuts. No agenda — just a chance to say hello.",
  },
];

export default async function ImNewPage() {
  const settings = await getSiteSettings();
  const address = settings?.address;

  return (
    <>
      <InteriorHero
        eyebrow="We've been saving you a seat"
        title="Plan your visit."
        lede="Everything you need to know before Sunday — where to park, what to wear, what to expect, and how to meet us once you're here."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "I'm new" }]}
        photoLabel="Narthex on Sunday morning"
        photoBrief="Greeters welcoming a family · warm, natural light."
        photoTone="warm"
      />

      {/* ---- Three steps ------------------------------------------ */}
      <section className="bg-cream py-24">
        <Container width="wide">
          <SectionHead eyebrow="In three steps" title="Your first Sunday" />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-lg border border-rule bg-white p-8"
              >
                <div className="font-serif text-4xl font-bold leading-none text-rust">
                  {s.n}
                </div>
                <h3 className="mt-4 font-serif text-xl font-bold text-navy">
                  {s.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ---- Welcome form card ------------------------------------ */}
      <section className="py-24">
        <Container width="wide">
          <div className="sh-on-dark grid gap-10 overflow-hidden rounded-xl bg-navy p-8 text-white md:grid-cols-[1.1fr_1fr] md:items-center md:p-12">
            <div>
              <span className="sh-eyebrow text-gold">Send us a note first</span>
              <h2 className="mt-3 text-white">
                We&rsquo;d love to meet you before Sunday.
              </h2>
              <p className="mt-4 text-white/85">
                Tell us a bit about yourself and we&rsquo;ll make sure a greeter is
                watching for you. We&rsquo;ll also follow up with anything you
                need — parking, kids&rsquo; programs, sacraments.
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 text-ink sm:p-8">
              <h3 className="font-serif text-lg font-bold text-navy">
                Welcome form
              </h3>
              <div className="mt-4">
                <WelcomeForm />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ---- What to expect --------------------------------------- */}
      <section className="bg-cream py-24">
        <Container width="wide">
          <SectionHead eyebrow="The basics" title="What to expect" />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ServeTile
              href="/mass"
              title="Mass is 55 minutes"
              description="Music, Scripture, homily, Communion. Follow along — no one expects you to know when to stand or sit."
              icon={<ClockIcon />}
            />
            <ServeTile
              href="/contact"
              title="Free parking"
              description="Large lot behind the church plus overflow across the street. Accessible spots at the main entrance."
              icon={<MenuIcon />}
            />
            <ServeTile
              href="/ministries"
              title="Kids are welcome"
              description="Cry room off the narthex. Kids Corner during the 10:30 Mass. No shushing required."
              icon={<PersonIcon />}
              tone="navy"
            />
            <ServeTile
              href="/contact"
              title={
                address
                  ? `${address.street}`
                  : "1600 Rahway Avenue"
              }
              description={
                address
                  ? `${address.city}, ${address.state} ${address.zip}. Ten minutes from the Westfield train station.`
                  : "Westfield, NJ 07090. Ten minutes from the Westfield train station."
              }
              icon={<MapPinIcon />}
            />
          </div>
        </Container>
      </section>
    </>
  );
}

/* ---- Icons ---- */

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20c0-4 3-6 6-6s6 2 6 6" />
    </svg>
  );
}
function MapPinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 7-8 12-8 12S4 17 4 10a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
