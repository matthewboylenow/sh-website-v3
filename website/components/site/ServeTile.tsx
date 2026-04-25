import Link from "next/link";
import { type ReactNode } from "react";

/**
 * Small "Start here" tile used on the homepage serve grid and on
 * /im-new. Four-up. Icon + title + one-line description.
 */
export function ServeTile({
  href,
  title,
  description,
  icon,
  tone = "cream",
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone?: "cream" | "navy";
}) {
  if (tone === "navy") {
    return (
      <Link
        href={href}
        className="group block rounded-lg bg-navy p-6 text-white transition-all hover:-translate-y-1 hover:shadow-hover"
      >
        <div className="grid size-9 place-items-center rounded-md bg-white/10 text-gold">
          {icon}
        </div>
        <h4 className="mt-4 font-serif text-lg font-bold text-white">
          {title}
        </h4>
        <p className="mt-1 text-sm leading-relaxed text-white/80">
          {description}
        </p>
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-rule bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-hover"
    >
      <div className="grid size-9 place-items-center rounded-md bg-rust-pale text-rust-dark">
        {icon}
      </div>
      <h4 className="mt-4 font-serif text-lg font-bold text-navy">{title}</h4>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{description}</p>
    </Link>
  );
}
