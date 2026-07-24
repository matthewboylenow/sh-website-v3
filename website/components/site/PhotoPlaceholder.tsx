import Image from "next/image";
import { type ReactNode } from "react";

/**
 * Photo slot — renders a real image via next/image when `imageUrl` is
 * provided, else falls back to the placeholder treatment with the
 * "photo brief" caption.
 *
 * Every hero / card / video tile across the site goes through this so
 * the design degrades gracefully before the parish photoshoot lands
 * (per design-notes.html §02).
 */
export function PhotoPlaceholder({
  imageUrl,
  imageAlt,
  label = "Photo placeholder",
  brief,
  tone = "navy",
  className = "",
  aspect = "4/3",
  sizes = "(max-width: 768px) 100vw, 720px",
  priority = false,
  imagePosition,
  children,
}: {
  /** When provided, render this image instead of the placeholder. */
  imageUrl?: string | null;
  /** Required when imageUrl is set. Falls back to brief or label. */
  imageAlt?: string | null;
  /** Small tag in the placeholder corner. */
  label?: string;
  /** Art-direction note shown as the placeholder caption. */
  brief?: string;
  /** Color palette — navy for interiors, cream for softer accents. */
  tone?: "navy" | "cream" | "warm";
  /** Aspect ratio (default "4/3"). */
  aspect?: string;
  /** Pass through to next/image for responsive images. */
  sizes?: string;
  /** Hint to next/image for above-the-fold images. */
  priority?: boolean;
  /** CSS object-position for the cover crop (e.g. "center 25%" to keep
   *  faces in frame when a portrait photo fills a landscape slot). */
  imagePosition?: string;
  className?: string;
  children?: ReactNode;
}) {
  if (imageUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-lg border border-rule bg-cream ${className}`}
        style={{ aspectRatio: aspect }}
      >
        <Image
          src={imageUrl}
          alt={imageAlt ?? brief ?? label}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          style={imagePosition ? { objectPosition: imagePosition } : undefined}
        />
        {children}
      </div>
    );
  }

  const bgByTone: Record<typeof tone, string> = {
    navy: "bg-gradient-to-br from-navy/95 to-navy-dark",
    cream: "bg-gradient-to-br from-cream to-cream-alt",
    warm: "bg-gradient-to-br from-navy/90 via-navy to-rust-dark/60",
  };
  const labelToneCls =
    tone === "cream"
      ? "bg-navy/10 text-navy"
      : "bg-white/15 text-white backdrop-blur-sm";
  const briefToneCls = tone === "cream" ? "text-ink-3" : "text-white/80";

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-rule ${bgByTone[tone]} ${className}`}
      style={{ aspectRatio: aspect }}
      aria-hidden="true"
    >
      {tone !== "cream" && (
        <div className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(circle_at_20%_30%,rgba(245,212,122,0.18),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(205,83,52,0.32),transparent_55%)]" />
      )}
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <span
          className={`w-fit rounded-pill px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${labelToneCls}`}
        >
          {label}
        </span>
        {brief && (
          <p
            className={`mt-3 max-w-[36ch] text-xs leading-relaxed ${briefToneCls}`}
          >
            {brief}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
