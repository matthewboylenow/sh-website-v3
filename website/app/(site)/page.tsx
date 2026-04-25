import Link from "next/link";
import { Container } from "@/components/site/Container";
import { EventCard } from "@/components/site/EventCard";
import { Matchmaker } from "@/components/ministries/Matchmaker";
import { MinistryCard } from "@/components/site/MinistryCard";
import { PhotoPlaceholder } from "@/components/site/PhotoPlaceholder";
import { SectionHead } from "@/components/site/SectionHead";
import { ServeTile } from "@/components/site/ServeTile";
import { getFeaturedEvents } from "@/lib/queries/events.query";
import { getWeeklyMassTimes } from "@/lib/queries/mass-times.query";
import { getSpotlightMinistries } from "@/lib/queries/ministries.query";
import { getActiveSeasonalBanner } from "@/lib/queries/seasonal-banners.query";
import { getSiteSettings } from "@/lib/queries/site-settings.query";

export const revalidate = 3600;

export default async function HomePage() {
  const [banner, spotlightMinistries, featuredEvents, weeklyMassTimes, settings] =
    await Promise.all([
      getActiveSeasonalBanner(),
      getSpotlightMinistries(2),
      getFeaturedEvents(4),
      getWeeklyMassTimes(),
      getSiteSettings(),
    ]);

  const sundayMasses = weeklyMassTimes.filter((m) => m.dayOfWeek === 0);
  const vigilMasses = weeklyMassTimes.filter((m) => m.dayOfWeek === 6 && m.kind === "vigil");
  const heroMassPeek = [...vigilMasses, ...sundayMasses].slice(0, 3);

  return (
    <>
      {/* ---- Hero ------------------------------------------------- */}
      <section className="relative bg-cream pt-16 pb-24 sm:pt-24 sm:pb-32">
        <Container width="wide">
          <div className="grid gap-12 md:grid-cols-[1.15fr_1fr] md:items-center">
            <div>
              <span className="sh-eyebrow">We&rsquo;re glad you&rsquo;re here</span>
              <h1 className="sh-display mt-4 max-w-[12ch]">Welcome home.</h1>
              <p className="sh-lede mt-6 max-w-[48ch]">
                Whether it&rsquo;s your first time or your hundredth, there&rsquo;s a
                seat saved for you at Saint Helen. Mass times, what to expect on
                Sunday, and the people who make this parish feel like home.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/im-new"
                  className="inline-flex items-center gap-2 rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark"
                >
                  Plan your visit <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/mass"
                  className="inline-flex items-center rounded-pill border border-rule bg-white px-6 py-3 text-sm font-semibold text-navy transition-colors hover:border-navy"
                >
                  Watch Sunday&rsquo;s Mass
                </Link>
              </div>

              {heroMassPeek.length > 0 && (
                <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-2">
                  <span className="sh-eyebrow">This Sunday</span>
                  {heroMassPeek.map((m) => (
                    <span
                      key={m.id}
                      className="font-serif text-base font-bold text-navy"
                    >
                      {formatMassTime(m.time)}
                    </span>
                  ))}
                  <Link
                    href="/mass"
                    className="text-xs font-semibold text-rust-dark hover:text-rust"
                  >
                    Full schedule →
                  </Link>
                </div>
              )}
            </div>

            <PhotoPlaceholder
              label="Hero photo"
              brief="Exterior or congregation photo — warm light, real parishioners. See design-notes.html §02 for the planned shoot."
              tone="navy"
              aspect="4/5"
            />
          </div>
        </Container>
      </section>

      {/* ---- Seasonal banner (only when active) ------------------- */}
      {banner && (
        <section className="bg-white pt-0 pb-8">
          <Container width="wide">
            <Link
              href={banner.ctaUrl ?? "#"}
              className="group flex flex-col gap-6 overflow-hidden rounded-lg border border-rule bg-gradient-to-br from-gold/20 via-cream to-rust-pale p-8 shadow-md transition-all hover:-translate-y-1 hover:shadow-hover md:flex-row md:items-center"
            >
              <div className="flex-1">
                <span className="sh-eyebrow">Seasonal</span>
                <h3 className="mt-2 font-serif text-2xl font-bold text-navy">
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="mt-2 text-ink-2">{banner.subtitle}</p>
                )}
              </div>
              {banner.ctaLabel && (
                <span className="inline-flex items-center gap-2 font-semibold text-rust-dark">
                  {banner.ctaLabel} <span aria-hidden="true">→</span>
                </span>
              )}
            </Link>
          </Container>
        </section>
      )}

      {/* ---- Serve grid ------------------------------------------- */}
      <section className="bg-cream py-24">
        <Container width="wide">
          <SectionHead
            eyebrow="Start here"
            title="How can we serve you today?"
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <Link
              href="/im-new"
              className="group block overflow-hidden rounded-lg border border-rule bg-white transition-all hover:-translate-y-1 hover:shadow-hover"
            >
              <PhotoPlaceholder
                label="I'm new photo"
                brief="Greeters welcoming a family — warm, natural light."
                tone="warm"
                aspect="16/9"
                className="rounded-none border-0"
              />
              <div className="p-8">
                <span className="sh-eyebrow">New here?</span>
                <h3 className="mt-2 font-serif text-2xl font-bold text-navy">
                  I&rsquo;m new
                </h3>
                <p className="mt-2 text-ink-2">
                  A warm welcome, a guide to our Masses, and easy ways to meet
                  people.
                </p>
              </div>
            </Link>
            <Link
              href="/mass"
              className="group block overflow-hidden rounded-lg border border-rule bg-white transition-all hover:-translate-y-1 hover:shadow-hover"
            >
              <PhotoPlaceholder
                label="Livestream photo"
                brief="Sanctuary during Mass — candlelight, shallow depth."
                tone="navy"
                aspect="16/9"
                className="rounded-none border-0"
              />
              <div className="p-8">
                <span className="sh-eyebrow">Can&rsquo;t make it in person?</span>
                <h3 className="mt-2 font-serif text-2xl font-bold text-navy">
                  Watch online
                </h3>
                <p className="mt-2 text-ink-2">
                  Every weekend Mass livestreamed via Subsplash. Plus replays
                  and pastor messages.
                </p>
              </div>
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ServeTile
              href="/mass"
              title="Mass times"
              description="Weekend, weekday, and holy-day schedule."
              icon={<CalendarIcon />}
            />
            <ServeTile
              href="/contact"
              title="Mass intentions"
              description="Request a Mass intention or memorial offering."
              icon={<MailIcon />}
            />
            <ServeTile
              href="/ministries"
              title="Ministries"
              description="Find a ministry that fits — 8 to choose from so far."
              icon={<PeopleIcon />}
              tone="navy"
            />
            <ServeTile
              href="/give"
              title="Give"
              description="Support the parish — weekly, one-time, or planned."
              icon={<HeartIcon />}
            />
          </div>
        </Container>
      </section>

      {/* ---- Pastor welcome --------------------------------------- */}
      <section className="py-24">
        <Container width="wide">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <PhotoPlaceholder
              label="Pastor's welcome"
              brief="A 90-second welcome from Fr. Tom — video slot waiting on a recording."
              tone="warm"
              aspect="4/3"
            />
            <div>
              <span className="sh-eyebrow">A word from Fr. Tom</span>
              <h2 className="mt-2 text-[clamp(28px,3.2vw,40px)]">
                Welcome to Saint Helen.
              </h2>
              <p className="sh-lede mt-4">
                A short welcome from our pastor — his invitation to visit,
                what to expect on a Sunday, and why we think you&rsquo;ll feel at
                home here.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/im-new"
                  className="inline-flex items-center gap-2 rounded-pill bg-navy px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-light"
                >
                  Plan your visit <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-pill border border-rule bg-white px-6 py-3 text-sm font-semibold text-navy transition-colors hover:border-navy"
                >
                  Contact the parish
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ---- Find your place — Ministries spotlight --------------- */}
      <section className="bg-navy py-24 text-white">
        <Container width="wide">
          <SectionHead
            eyebrow="Ministries spotlight"
            title="Find your place"
            tone="on-navy"
            lede="Every ministry at Saint Helen — from contemplative prayer to hands-on outreach. Take 60 seconds and we'll help you find your fit."
          />
          {spotlightMinistries.length > 0 ? (
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {spotlightMinistries.map((m) => (
                <MinistryCard key={m.slug} ministry={m} tone="on-navy" />
              ))}
            </div>
          ) : (
            <p className="mt-8 text-white/80">
              No ministries published yet — seed or admin them in.
            </p>
          )}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Matchmaker
              manifest={settings?.matchmaker ?? { questions: [] }}
              triggerLabel="Ministry matchmaker"
              triggerVariant="rust"
            />
            <Link
              href="/ministries"
              className="inline-flex items-center rounded-pill border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Browse all ministries
            </Link>
          </div>
        </Container>
      </section>

      {/* ---- Featured events -------------------------------------- */}
      <section className="bg-cream py-24">
        <Container width="wide">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHead eyebrow="What's happening" title="Featured events" />
            <Link
              href="/events"
              className="text-sm font-semibold text-rust-dark hover:text-rust"
            >
              View all events <span aria-hidden="true">→</span>
            </Link>
          </div>
          {featuredEvents.length > 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredEvents.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          ) : (
            <p className="mt-8 text-ink-2">
              No featured events — mark one in the admin when Step 4 ships.
            </p>
          )}
        </Container>
      </section>

      {/* ---- Weekly bulletin placeholder -------------------------- */}
      <section className="py-24">
        <Container width="wide">
          <SectionHead eyebrow="Every Sunday" title="The Weekly Bulletin" />
          <div className="mt-12 grid gap-6 rounded-lg border border-rule bg-white p-8 shadow-md md:grid-cols-[1fr_1.2fr]">
            <div className="rounded-md bg-cream p-6">
              <span className="inline-block rounded-pill bg-rust px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                This week
              </span>
              <div className="mt-4 font-serif text-5xl font-bold text-navy">
                Apr&nbsp;27
              </div>
              <p className="mt-2 text-sm text-ink-3">
                Fourth Sunday of Easter · 2026
              </p>
              <p className="mt-4 text-sm text-ink-2">
                Bulletin PDF — placeholder. The modal viewer ships with the
                Vercel Blob upload flow (Step 5) and the admin bulletin editor.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-3">
                Previous bulletins
              </p>
              <p className="mt-3 text-sm text-ink-2">
                Last three issues will appear here once bulletins start
                publishing. For now, no archive exists in the database yet.
              </p>
              <Link
                href="/bulletin"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-rust-dark hover:text-rust"
              >
                View bulletin archive <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ---- Support ---------------------------------------------- */}
      <section className="bg-navy-dark py-24 text-center text-white">
        <Container width="default">
          <span className="sh-eyebrow text-gold">Stewardship</span>
          <h2 className="mt-4 text-white">Support our mission</h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-white/80">
            Every gift — large or small, one-time or weekly — supports the
            worship, service, and discipleship that happens here every day.
          </p>
          <Link
            href="/give"
            className="mt-8 inline-flex items-center gap-2 rounded-pill bg-rust px-8 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark"
          >
            Give now <span aria-hidden="true">→</span>
          </Link>
        </Container>
      </section>
    </>
  );
}

/* ---- Formatting helpers ---- */

function formatMassTime(timeStr: string): string {
  // timeStr is "HH:MM:SS" from Postgres time column
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/* ---- Inline SVG icons (simple, trust-me stroke) ---- */

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h18v12H3z" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3 20c.8-3.5 3.3-5.5 6-5.5s5.2 2 6 5.5" />
      <path d="M15 20c.5-2 1.8-3.2 3.5-3.2S21.5 18 22 20" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21.4l8.8-8.9a5.5 5.5 0 0 0 0-7.9z" />
    </svg>
  );
}
