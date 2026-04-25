import Link from "next/link";
import { type Ministry } from "@/db/schema";
import { PhotoPlaceholder } from "./PhotoPlaceholder";

/**
 * Ministry card — .ministry-card in the mockup. Used on the homepage
 * "Find your place" section and on /ministries.
 *
 * Pass `imageUrl` to render the bound photo; omit for the placeholder.
 */
export function MinistryCard({
  ministry,
  tone = "on-cream",
  imageUrl,
}: {
  ministry: Pick<
    Ministry,
    "slug" | "name" | "tagline" | "description" | "photoBlobKey"
  >;
  /** Context — "on-navy" for the homepage spotlight, "on-cream" for list pages. */
  tone?: "on-navy" | "on-cream";
  imageUrl?: string | null;
}) {
  const containerCls =
    tone === "on-navy"
      ? "bg-white/5 border-white/10 hover:bg-white/10"
      : "bg-white border-rule hover:shadow-hover hover:-translate-y-1";
  const titleCls = tone === "on-navy" ? "text-white" : "text-navy";
  const ledeCls = tone === "on-navy" ? "text-white/75" : "text-ink-2";
  const ctaCls = tone === "on-navy" ? "text-gold" : "text-rust-dark";

  return (
    <Link
      href={`/ministries/${ministry.slug}`}
      className={`group block overflow-hidden rounded-lg border transition-all ${containerCls}`}
    >
      <PhotoPlaceholder
        imageUrl={imageUrl}
        imageAlt={ministry.name}
        label="Ministry photo"
        brief={`${ministry.name} · real-members photography`}
        tone={tone === "on-navy" ? "warm" : "navy"}
        aspect="16/10"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
        className="rounded-none border-0"
      />
      <div className="p-6">
        <h3 className={`font-serif text-xl font-bold ${titleCls}`}>
          {ministry.name}
        </h3>
        {(ministry.tagline || ministry.description) && (
          <p className={`mt-2 text-sm leading-relaxed ${ledeCls}`}>
            {ministry.tagline ?? ministry.description}
          </p>
        )}
        <span
          className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold ${ctaCls}`}
        >
          Get involved
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
