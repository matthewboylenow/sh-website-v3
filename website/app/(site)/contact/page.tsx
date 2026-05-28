import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { Container } from "@/components/site/Container";
import { WelcomeForm } from "@/components/forms/WelcomeForm";
import { db } from "@/db";
import {
  siteSettings,
  type SiteAddress,
  type SocialLinks,
} from "@/db/schema";

export const revalidate = 600;
export const metadata = {
  title: "Contact Saint Helen",
  description:
    "Visit, call, email, or fill out our welcome form — we'd love to hear from you.",
};

const getContactSettings = unstable_cache(
  async () => {
    const [row] = await db
      .select({
        contactEmail: siteSettings.contactEmail,
        contactPhone: siteSettings.contactPhone,
        address: siteSettings.address,
        socialLinks: siteSettings.socialLinks,
      })
      .from(siteSettings)
      .where(eq(siteSettings.id, 1))
      .limit(1);
    return row ?? null;
  },
  ["contact:settings"],
  { tags: ["site-settings"], revalidate: 600 },
);

export default async function ContactPage() {
  const settings = await getContactSettings();
  const address = settings?.address as SiteAddress | null;
  const social = settings?.socialLinks as SocialLinks | null;
  const phoneDigits = settings?.contactPhone?.replace(/\D/g, "") ?? "";
  const mapsQuery = address
    ? encodeURIComponent(
        `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
      )
    : null;

  return (
    <>
      <section className="bg-cream pt-28 pb-12 sm:pt-32 sm:pb-16">
        <Container width="wide">
          <span className="sh-eyebrow">Contact</span>
          <h1 className="mt-3 text-[clamp(36px,4.4vw,56px)]">Get in touch</h1>
          <p className="sh-lede mt-4 max-w-[58ch]">
            Visit us, call us, email us, or fill out our welcome form — whatever
            feels easiest. We&rsquo;ll get back to you within a day or two.
          </p>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container width="wide">
          <div className="grid gap-12 md:grid-cols-[1.2fr_1fr]">
            <div className="space-y-10">
              <div>
                <h2 className="font-serif text-2xl font-bold text-navy">
                  Parish office
                </h2>
                <dl className="mt-4 space-y-3 text-sm text-ink">
                  {settings?.contactPhone && (
                    <div className="flex flex-wrap gap-2">
                      <dt className="w-20 text-ink-3">Phone</dt>
                      <dd>
                        <a
                          href={`tel:${phoneDigits}`}
                          className="font-semibold text-rust-dark hover:text-rust"
                        >
                          {settings.contactPhone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {settings?.contactEmail && (
                    <div className="flex flex-wrap gap-2">
                      <dt className="w-20 text-ink-3">Email</dt>
                      <dd>
                        <a
                          href={`mailto:${settings.contactEmail}`}
                          className="font-semibold text-rust-dark hover:text-rust"
                        >
                          {settings.contactEmail}
                        </a>
                      </dd>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <dt className="w-20 text-ink-3">Hours</dt>
                    <dd>Monday – Friday, 9:30 am – 5:00 pm</dd>
                  </div>
                  {address && (
                    <div className="flex flex-wrap gap-2">
                      <dt className="w-20 text-ink-3">Address</dt>
                      <dd>
                        {address.street}
                        <br />
                        {address.city}, {address.state} {address.zip}
                      </dd>
                    </div>
                  )}
                </dl>
                {mapsQuery && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center rounded-pill border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy"
                  >
                    Open in Google Maps &rarr;
                  </a>
                )}
              </div>

              {(social?.facebook || social?.instagram || social?.youtube) && (
                <div>
                  <h2 className="font-serif text-2xl font-bold text-navy">
                    Follow Saint Helen
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {social?.facebook && (
                      <a
                        href={social.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-pill border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy"
                      >
                        Facebook
                      </a>
                    )}
                    {social?.instagram && (
                      <a
                        href={social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-pill border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy"
                      >
                        Instagram
                      </a>
                    )}
                    {social?.youtube && (
                      <a
                        href={social.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-pill border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy"
                      >
                        YouTube
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <aside className="self-start rounded-lg border border-rule bg-cream p-6 sm:p-8">
              <h2 className="font-serif text-2xl font-bold text-navy">
                Send us a note
              </h2>
              <p className="mt-2 text-sm text-ink-2">
                Tell us a bit about yourself — we&rsquo;ll get back to you
                within a day or two.
              </p>
              <div className="mt-5">
                <WelcomeForm />
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </>
  );
}
