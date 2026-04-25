import { type ReactNode } from "react";

/**
 * Section heading — eyebrow, title, optional rust rule, optional lede.
 * Mirrors .sect-head in the mockup's kit.css.
 */
export function SectionHead({
  eyebrow,
  title,
  lede,
  align = "left",
  rule = true,
  tone = "default",
  className = "",
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
  rule?: boolean;
  tone?: "default" | "on-navy";
  className?: string;
  children?: ReactNode;
}) {
  const alignCls = align === "center" ? "text-center mx-auto" : "";
  const eyebrowCls =
    tone === "on-navy" ? "text-gold" : "text-rust";
  const ledeCls = tone === "on-navy" ? "text-white/80" : "text-ink-2";
  const titleCls = tone === "on-navy" ? "text-white" : "";

  return (
    <div className={`max-w-[60ch] ${alignCls} ${className}`}>
      {eyebrow && (
        <span
          className={`font-sans text-xs font-semibold uppercase tracking-[0.14em] ${eyebrowCls}`}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={`mt-2 text-[clamp(28px,3.2vw,40px)] font-bold ${titleCls}`}
      >
        {title}
      </h2>
      {rule && (
        <span
          className={`mt-3 inline-block h-[3px] w-14 rounded-sm ${
            tone === "on-navy" ? "bg-gold" : "bg-rust"
          }`}
          aria-hidden="true"
        />
      )}
      {lede && (
        <p className={`mt-4 text-[17px] leading-snug ${ledeCls}`}>{lede}</p>
      )}
      {children}
    </div>
  );
}
