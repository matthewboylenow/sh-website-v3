import Link from "next/link";
import { Container } from "@/components/site/Container";

export const metadata = {
  title: "Design System",
  description:
    "Saint Helen 3.0 token reference — colors, type, radii, shadows. Use this page to verify fidelity to /design-ref/pages/components.html.",
};

const COLOR_GROUPS: { title: string; tokens: { name: string; cssVar: string; tw?: string; note?: string }[] }[] = [
  {
    title: "Navy",
    tokens: [
      { name: "Navy",       cssVar: "--sh-navy",       tw: "bg-navy",       note: "Primary surfaces, masthead" },
      { name: "Navy Dark",  cssVar: "--sh-navy-dark",  tw: "bg-navy-dark",  note: "Footer, deep depth" },
      { name: "Navy Light", cssVar: "--sh-navy-light", tw: "bg-navy-light", note: "Hover state on navy" },
      { name: "Navy Pale",  cssVar: "--sh-navy-pale",  tw: "bg-navy-pale",  note: "Subtle tinted background" },
    ],
  },
  {
    title: "Rust",
    tokens: [
      { name: "Rust",       cssVar: "--sh-rust",       tw: "bg-rust",       note: "Primary CTA, accent" },
      { name: "Rust Dark",  cssVar: "--sh-rust-dark",  tw: "bg-rust-dark",  note: "Inline links — clears AA on white" },
      { name: "Rust Light", cssVar: "--sh-rust-light", tw: "bg-rust-light", note: "Soft accent" },
      { name: "Rust Pale",  cssVar: "--sh-rust-pale",  tw: "bg-rust-pale",  note: "Tinted panels" },
    ],
  },
  {
    title: "Neutrals",
    tokens: [
      { name: "Cream",     cssVar: "--sh-cream",     tw: "bg-cream",     note: "Soft section background" },
      { name: "Cream Alt", cssVar: "--sh-cream-alt", tw: "bg-cream-alt", note: "Alternating section bg" },
      { name: "Gold",      cssVar: "--sh-gold",      tw: "bg-gold",      note: "Seasonal — sparingly" },
      { name: "Rule",      cssVar: "--sh-rule",      tw: "border-rule",  note: "Card / section borders" },
    ],
  },
];

const TYPE_SAMPLES: { label: string; cls: string; size: string; sample: string }[] = [
  { label: "Display",  cls: "sh-display",                                          size: "var(--fs-display)",  sample: "Welcome home." },
  { label: "H1",       cls: "font-serif text-[length:var(--fs-h1)] font-bold",     size: "var(--fs-h1)",       sample: "A parish that meets you where you are." },
  { label: "H2",       cls: "font-serif text-[length:var(--fs-h2)] font-bold",     size: "var(--fs-h2)",       sample: "The four changes in 3.0" },
  { label: "H3",       cls: "font-serif text-[length:var(--fs-h3)] font-bold",     size: "var(--fs-h3)",       sample: "Newcomer clarity" },
  { label: "Lede",     cls: "sh-lede",                                             size: "var(--fs-body-lg)",  sample: "Mass times, what to expect, and the people who make this parish feel like home." },
  { label: "Body",     cls: "text-[length:var(--fs-body)]",                        size: "var(--fs-body)",     sample: "Saint Helen is a Roman Catholic parish in Westfield, NJ." },
  { label: "Eyebrow",  cls: "sh-eyebrow",                                          size: "var(--fs-eyebrow)",  sample: "I'm New" },
  { label: "Small",    cls: "text-[length:var(--fs-small)] text-ink-3",            size: "var(--fs-small)",    sample: "Updated 2 hours ago" },
];

export default function DesignSystemPage() {
  return (
    <div className="min-h-dvh bg-cream pb-32">
      <header className="border-b border-rule bg-white">
        <Container width="wide">
          <div className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div>
              <p className="sh-eyebrow">Saint Helen 3.0</p>
              <h1 className="mt-1 text-2xl">Design system reference</h1>
            </div>
            <Link
              href="/"
              className="text-sm font-semibold text-rust-dark hover:text-rust"
            >
              &larr; Back to site
            </Link>
          </div>
        </Container>
      </header>

      <Container width="wide" className="pt-16">
        <p className="sh-lede max-w-[60ch]">
          Live token reference. If something here looks wrong vs.{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-sm">
            design-ref/pages/components.html
          </code>
          , the tokens in <code className="rounded bg-white px-1.5 py-0.5 text-sm">app/globals.css</code> are out of sync.
        </p>

        {/* Colors */}
        <section className="mt-16">
          <h2 className="text-2xl">Color</h2>
          <div className="mt-6 space-y-12">
            {COLOR_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="sh-eyebrow">{group.title}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {group.tokens.map((token) => (
                    <div
                      key={token.cssVar}
                      className="overflow-hidden rounded-md border border-rule bg-white"
                    >
                      <div
                        className="h-24 w-full"
                        style={{ background: `var(${token.cssVar})` }}
                      />
                      <div className="p-4">
                        <p className="font-serif text-base font-bold text-navy">
                          {token.name}
                        </p>
                        <p className="mt-1 font-mono text-xs text-ink-3">
                          {token.cssVar}
                        </p>
                        {token.tw && (
                          <p className="mt-0.5 font-mono text-xs text-ink-3">
                            {token.tw}
                          </p>
                        )}
                        {token.note && (
                          <p className="mt-2 text-xs text-ink-2">
                            {token.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Type */}
        <section className="mt-20">
          <h2 className="text-2xl">Type scale</h2>
          <div className="mt-6 overflow-hidden rounded-md border border-rule bg-white">
            <table className="w-full text-left">
              <thead className="bg-cream">
                <tr className="text-xs uppercase tracking-[0.14em] text-ink-3">
                  <th className="w-[120px] px-4 py-3 font-semibold">Token</th>
                  <th className="w-[180px] px-4 py-3 font-semibold">Size</th>
                  <th className="px-4 py-3 font-semibold">Sample</th>
                </tr>
              </thead>
              <tbody>
                {TYPE_SAMPLES.map((row) => (
                  <tr
                    key={row.label}
                    className="border-t border-rule align-baseline"
                  >
                    <td className="px-4 py-4 font-mono text-xs text-ink-3">
                      {row.label}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-ink-3">
                      {row.size}
                    </td>
                    <td className="px-4 py-4">
                      <span className={row.cls}>{row.sample}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Buttons */}
        <section className="mt-20">
          <h2 className="text-2xl">Buttons</h2>
          <p className="mt-2 text-sm text-ink-3">
            Real <code>Button</code> component lands with shadcn/ui in Step 1
            (this page is a fidelity check, not the canonical implementation).
          </p>
          <div className="mt-6 flex flex-wrap gap-4 rounded-md border border-rule bg-white p-8">
            <button className="inline-flex items-center rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark">
              Primary &mdash; Rust
            </button>
            <button className="inline-flex items-center rounded-pill bg-navy px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-light">
              Secondary &mdash; Navy
            </button>
            <button className="inline-flex items-center rounded-pill border border-rule bg-white px-6 py-3 text-sm font-semibold text-navy transition-colors hover:border-navy">
              Outline
            </button>
            <button className="inline-flex items-center rounded-pill bg-gold px-6 py-3 text-sm font-semibold text-navy-dark shadow-sm transition-colors hover:opacity-90">
              Seasonal &mdash; Gold
            </button>
          </div>
        </section>

        {/* Radii / shadows */}
        <section className="mt-20 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl">Radii</h2>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                ["xs", "4px"],
                ["sm", "8px"],
                ["md", "12px"],
                ["lg", "16px"],
                ["xl", "24px"],
                ["pill", "999px"],
              ].map(([name, val]) => (
                <div key={name} className="text-center">
                  <div
                    className="aspect-square w-full bg-navy"
                    style={{ borderRadius: `var(--radius-${name})` }}
                  />
                  <p className="mt-2 font-mono text-xs text-ink-3">
                    {name} &middot; {val}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl">Shadows</h2>
            <div className="mt-6 space-y-4">
              {["xs", "sm", "md", "lg", "hover"].map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-md bg-white p-5"
                  style={{ boxShadow: `var(--shadow-${name})` }}
                >
                  <span className="font-mono text-xs text-ink-3">
                    --shadow-{name}
                  </span>
                  <span className="font-serif text-sm font-bold text-navy">
                    Aa
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
