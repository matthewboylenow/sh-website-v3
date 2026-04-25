import Link from "next/link";
import { Container } from "@/components/site/Container";

const MASS_TIMES_PLACEHOLDER = [
  { kind: "Saturday Vigil", time: "5:00 PM" },
  { kind: "Sunday", time: "7:30 AM" },
  { kind: "Sunday", time: "9:00 AM" },
  { kind: "Sunday (Family)", time: "10:30 AM" },
  { kind: "Sunday", time: "12:00 PM" },
];

export default function HomePage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="bg-cream pt-20 pb-24 sm:pt-28 sm:pb-32">
        <Container width="wide">
          <div className="grid gap-12 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <span className="sh-eyebrow">Welcome Home</span>
              <h1 className="sh-display mt-4 max-w-[14ch]">
                A parish that meets you where you are.
              </h1>
              <p className="sh-lede mt-6 max-w-[52ch]">
                Whether it&rsquo;s your first time or your hundredth, you have a
                place at Saint Helen. Mass times, what to expect on Sunday,
                and the people who make this parish feel like home.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/im-new"
                  className="inline-flex items-center rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark"
                >
                  Plan your visit
                </Link>
                <Link
                  href="/mass"
                  className="inline-flex items-center rounded-pill border border-rule bg-white px-6 py-3 text-sm font-semibold text-navy transition-colors hover:border-navy"
                >
                  Mass times &amp; livestream
                </Link>
              </div>
            </div>

            <div className="relative">
              <PhotoPlaceholder
                brief="Family entering the narthex; warm light, real parishioners — see design-notes.html on the planned shoot."
              />
            </div>
          </div>
        </Container>
      </section>

      {/* ---- Mass times card ---- */}
      <section className="-mt-12 pb-24">
        <Container width="default">
          <div className="rounded-lg border border-rule bg-white p-8 shadow-md sm:p-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="sh-eyebrow">This week</span>
                <h2 className="mt-2 text-[clamp(24px,2.6vw,32px)]">
                  Mass times
                </h2>
              </div>
              <Link
                href="/mass"
                className="text-sm font-semibold text-rust-dark hover:text-rust"
              >
                Full schedule &amp; livestream &rarr;
              </Link>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {MASS_TIMES_PLACEHOLDER.map((m) => (
                <li
                  key={`${m.kind}-${m.time}`}
                  className="flex items-baseline justify-between gap-4 rounded-md bg-cream px-4 py-3"
                >
                  <span className="text-sm text-ink-3">{m.kind}</span>
                  <span className="font-serif text-base font-bold text-navy">
                    {m.time}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-ink-3">
              Placeholder schedule — real times will be wired to the database
              in Step 2.
            </p>
          </div>
        </Container>
      </section>

      {/* ---- Status callout (temporary; remove when Step 3 lands) ---- */}
      <section className="pb-32">
        <Container width="narrow">
          <div className="rounded-lg border-l-4 border-rust bg-white p-6 shadow-sm sm:p-8">
            <span className="sh-eyebrow">Build status</span>
            <h3 className="mt-2 text-xl">
              You are looking at Step 1 of 8.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              Design tokens are ported, fonts are wired, and the basic shell is
              live. Real homepage sections, the three interior pages, the
              admin, and the database all come next. See{" "}
              <Link href="/design-system" className="font-semibold">
                /design-system
              </Link>{" "}
              for the token reference, and{" "}
              <code className="rounded bg-cream px-1.5 py-0.5 text-xs">
                STATUS.md
              </code>{" "}
              at the repo root for the running log.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}

function PhotoPlaceholder({ brief }: { brief: string }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-rule bg-gradient-to-br from-navy/95 to-navy-dark">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(circle_at_20%_30%,rgba(245,212,122,0.18),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(205,83,52,0.32),transparent_55%)]" />
      <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
        <span className="rounded-pill bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm w-fit">
          Photo placeholder
        </span>
        <p className="mt-3 max-w-[36ch] text-xs leading-relaxed text-white/80">
          {brief}
        </p>
      </div>
    </div>
  );
}
