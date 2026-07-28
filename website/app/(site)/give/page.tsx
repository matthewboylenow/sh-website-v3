import Link from "next/link";
import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { Container } from "@/components/site/Container";
import { db } from "@/db";
import { siteSettings, type GivingSettings, type SiteAddress } from "@/db/schema";

export const revalidate = 600;
export const metadata = {
  title: "Give to Saint Helen",
  description:
    "Support the mission of Saint Helen — make a one-time gift, set up recurring giving, or designate your contribution to a specific fund.",
};

const getGivingSettings = unstable_cache(
  async () => {
    const [row] = await db
      .select({
        giving: siteSettings.giving,
        contactEmail: siteSettings.contactEmail,
        contactPhone: siteSettings.contactPhone,
        address: siteSettings.address,
      })
      .from(siteSettings)
      .where(eq(siteSettings.id, 1))
      .limit(1);
    return row ?? null;
  },
  ["give:settings"],
  { tags: ["site-settings"], revalidate: 600 },
);

function isSeasonalActive(s: NonNullable<GivingSettings["seasonal"]>[number]): boolean {
  const now = Date.now();
  return (
    new Date(s.activeFrom).getTime() <= now &&
    new Date(s.activeUntil).getTime() >= now
  );
}

export default async function GivePage() {
  const settings = await getGivingSettings();
  const giving = settings?.giving;
  const activeSeasonal = (giving?.seasonal ?? []).filter(isSeasonalActive);
  const designations = giving?.designations ?? [];
  const primaryUrl = giving?.primaryUrl?.trim();
  const recurringUrl = giving?.recurringUrl?.trim();
  const address = settings?.address as SiteAddress | null;

  return (
    <>
      <section className="bg-cream pt-28 pb-12 sm:pt-32 sm:pb-16">
        <Container width="wide">
          <span className="sh-eyebrow">Give</span>
          <h1 className="mt-3 text-[clamp(36px,4.4vw,56px)]">
            Support the mission of Saint Helen
          </h1>
          <p className="sh-lede mt-4 max-w-[58ch]">
            Your generosity sustains worship, faith formation, outreach, and
            ministries that serve thousands of families across our community.
            Choose the giving method that works best for you.
          </p>
        </Container>
      </section>

      {activeSeasonal.length > 0 && (
        <section className="bg-white pt-10">
          <Container width="wide">
            <div className="rounded-xl bg-gradient-to-br from-rust to-rust-dark p-8 text-white sh-on-dark md:p-10">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-85">
                Active appeal
              </span>
              <h2 className="mt-2 font-serif text-2xl font-bold">
                {activeSeasonal[0]!.label}
              </h2>
              <a
                href={activeSeasonal[0]!.url}
                className="mt-5 inline-flex items-center gap-2 rounded-pill bg-white/15 px-5 py-2.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/25"
              >
                Give to this appeal <span aria-hidden="true">→</span>
              </a>
            </div>
          </Container>
        </section>
      )}

      <section className="bg-white py-16">
        <Container width="wide">
          <h2 className="font-serif text-3xl font-bold text-navy">Ways to give</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {primaryUrl && (
              <a
                href={primaryUrl}
                className="group flex flex-col gap-3 rounded-lg border border-rule bg-cream p-6 transition-colors hover:border-rust"
              >
                <span className="sh-eyebrow">Online giving</span>
                <h3 className="font-serif text-2xl font-bold text-navy">
                  Make a gift
                </h3>
                <p className="text-sm text-ink-2">
                  The easiest way to give — set up a one-time or recurring gift
                  using your bank account or credit card. Secure, convenient,
                  and takes less than a minute.
                </p>
                <span className="mt-auto text-sm font-semibold text-rust-dark group-hover:text-rust">
                  Give online &rarr;
                </span>
              </a>
            )}

            {recurringUrl && recurringUrl !== primaryUrl && (
              <a
                href={recurringUrl}
                className="group flex flex-col gap-3 rounded-lg border border-rule bg-cream p-6 transition-colors hover:border-rust"
              >
                <span className="sh-eyebrow">Recurring</span>
                <h3 className="font-serif text-2xl font-bold text-navy">
                  Set up a recurring gift
                </h3>
                <p className="text-sm text-ink-2">
                  Stewardship is a lifelong commitment. Schedule weekly,
                  monthly, or yearly contributions and never miss the
                  collection.
                </p>
                <span className="mt-auto text-sm font-semibold text-rust-dark group-hover:text-rust">
                  Set up recurring &rarr;
                </span>
              </a>
            )}

            <Link
              href="/p/heritage"
              className="group flex flex-col gap-3 rounded-lg border border-rule bg-cream p-6 transition-colors hover:border-rust"
            >
              <span className="sh-eyebrow">Planned giving</span>
              <h3 className="font-serif text-2xl font-bold text-navy">
                The Heritage Fund
              </h3>
              <p className="text-sm text-ink-2">
                Support parish needs, improvements, and programs through
                donations or bequests to this restricted fund — gifts that go
                above and beyond your regular offertory.
              </p>
              <span className="mt-auto text-sm font-semibold text-rust-dark group-hover:text-rust">
                Learn more &rarr;
              </span>
            </Link>
          </div>

          {designations.length > 0 && (
            <div className="mt-16">
              <h2 className="font-serif text-2xl font-bold text-navy">
                Give to a specific cause
              </h2>
              <p className="mt-2 text-sm text-ink-2">
                Direct your gift to a fund, program, or ministry that&rsquo;s
                close to your heart.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {designations.map((d) => (
                  <li key={d.url}>
                    <a
                      href={d.url}
                      className="flex items-center justify-between rounded-md border border-rule bg-white px-4 py-3 text-sm font-semibold text-navy transition-colors hover:border-rust hover:text-rust-dark"
                    >
                      {d.label}
                      <span aria-hidden="true">&rarr;</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-16">
            <h2 className="font-serif text-2xl font-bold text-navy">
              Other ways to give
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-2 rounded-lg border border-rule bg-white p-6">
                <span className="sh-eyebrow">Text-to-Give</span>
                <p className="text-sm text-ink-2">
                  Text <strong>GIVE</strong> to{" "}
                  <a
                    href="sms:9088608444&body=GIVE"
                    className="font-semibold text-rust-dark hover:text-rust"
                  >
                    (908) 860-8444
                  </a>{" "}
                  and follow the prompts — a quick, secure gift from your
                  phone.
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-rule bg-white p-6">
                <span className="sh-eyebrow">Offering envelopes</span>
                <p className="text-sm text-ink-2">
                  Prefer envelopes? Request a set by emailing{" "}
                  <a
                    href="mailto:sthelen@sainthelen.org"
                    className="font-semibold text-rust-dark hover:text-rust"
                  >
                    sthelen@sainthelen.org
                  </a>{" "}
                  or calling the parish office.
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-rule bg-white p-6">
                <span className="sh-eyebrow">Stock &amp; securities</span>
                <p className="text-sm text-ink-2">
                  Donate appreciated stocks, bonds, or mutual funds for
                  potential tax advantages. Contact the parish office for the
                  transfer form and instructions.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 rounded-lg bg-navy p-6 sh-on-dark sm:p-8">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
              Stewardship Spotlights
            </span>
            <h2 className="mt-2 font-serif text-2xl font-bold text-white">
              Meet our parishioners
            </h2>
            <p className="mt-2 max-w-[60ch] text-sm text-white/85">
              Stories of time, talent, and treasure from the Saint Helen
              community — see how your generosity is making a difference.
            </p>
            <Link
              href="/blog?category=stewardship"
              className="mt-5 inline-flex items-center gap-2 rounded-pill bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/25 hover:text-white"
            >
              Read their stories <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="mt-16 rounded-lg border border-rule bg-cream p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-navy">
              Need help giving?
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              For help with online giving, statements, planned gifts, or any
              giving question, send us a note and our Business Manager will get
              back to you.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-pill bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-dark hover:text-white"
              >
                Contact us about giving
              </Link>
              {settings?.contactPhone && (
                <a
                  href={`tel:${settings.contactPhone.replace(/\D/g, "")}`}
                  className="inline-flex items-center rounded-pill border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy"
                >
                  Call the parish office
                </a>
              )}
            </div>
            {address && (
              <p className="mt-4 text-xs text-ink-3">
                Mail checks to: Parish Community of Saint Helen, {address.street},{" "}
                {address.city}, {address.state} {address.zip}
              </p>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
