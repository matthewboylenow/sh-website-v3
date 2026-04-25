import Link from "next/link";
import { Container } from "./Container";
import { PhotoPlaceholder } from "./PhotoPlaceholder";

/**
 * Interior-page hero — .iv-hero.iv-hero-split in the mockup.
 * Breadcrumbs + eyebrow + title + lede + photo placeholder.
 */
export function InteriorHero({
  eyebrow,
  title,
  lede,
  breadcrumbs,
  photoBrief,
  photoLabel,
  photoTone = "navy",
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  breadcrumbs?: { label: string; href?: string }[];
  photoBrief?: string;
  photoLabel?: string;
  photoTone?: "navy" | "cream" | "warm";
}) {
  return (
    <section className="relative bg-cream pt-28 pb-14 sm:pt-32 sm:pb-20">
      <Container width="wide">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav
                aria-label="Breadcrumb"
                className="mb-4 flex flex-wrap items-center gap-x-2 text-xs text-ink-3"
              >
                {breadcrumbs.map((c, i) => (
                  <span key={`${c.label}-${i}`} className="flex items-center gap-2">
                    {c.href ? (
                      <Link href={c.href} className="hover:text-rust-dark">
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current={i === breadcrumbs.length - 1 ? "page" : undefined}>
                        {c.label}
                      </span>
                    )}
                    {i < breadcrumbs.length - 1 && (
                      <span aria-hidden="true" className="text-ink-4">/</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            {eyebrow && <span className="sh-eyebrow">{eyebrow}</span>}
            <h1 className="mt-3 text-[clamp(36px,4.4vw,56px)]">{title}</h1>
            {lede && <p className="sh-lede mt-4 max-w-[52ch]">{lede}</p>}
          </div>

          <PhotoPlaceholder
            label={photoLabel ?? "Photo placeholder"}
            brief={photoBrief}
            tone={photoTone}
            aspect="5/4"
          />
        </div>
      </Container>
    </section>
  );
}
