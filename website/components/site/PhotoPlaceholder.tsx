import { type ReactNode } from "react";

/**
 * Placeholder-friendly photo slot. Renders a styled empty state with a
 * "photo brief" until real imagery is bound. Every hero / card / video
 * tile in the spec (design-notes.html §02) ships through this.
 *
 * When a real image is provided, it should be rendered via next/image
 * — not this component. This is the empty state.
 */
export function PhotoPlaceholder({
  label = "Photo placeholder",
  brief,
  tone = "navy",
  className = "",
  aspect = "4/3",
  children,
}: {
  /** Small tag in the corner. */
  label?: string;
  /** Art-direction note shown as the caption. */
  brief?: string;
  /** Color palette — navy for interiors, cream for softer accents. */
  tone?: "navy" | "cream" | "warm";
  /** Override tailwind aspect ratio (default "4/3"). */
  aspect?: string;
  className?: string;
  children?: ReactNode;
}) {
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
