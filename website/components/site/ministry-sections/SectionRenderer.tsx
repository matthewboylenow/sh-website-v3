import Image from "next/image";
import type {
  MinistrySectionPayload,
  SectionHeader,
  EmbedPayload,
} from "@/db/schema";
import { RichTextRenderer } from "@/components/site/RichTextRenderer";
import { VideoBlock } from "./VideoBlock";

/**
 * Server-side renderer for a ministry section payload. Every block kind
 * funnels through one switch. Image-bearing blocks expect their photo
 * URLs to be already-resolved by the parent (via lib/blob.resolveKeys),
 * passed in via the `images` map keyed by blobKey.
 *
 * Staff cards expect a pre-resolved staff record map in `staff` keyed
 * by id. Both maps are computed once on the server in the page render.
 */

export type StaffRendered = {
  slug: string;
  name: string;
  role: string | null;
  email: string | null;
  photoBlobKey: string | null;
  bio: string | null;
};

export type RenderContext = {
  /** blobKey → public URL. Missing keys are absent from the map. */
  images: Map<string, string>;
  /** staffId → public-shape staff row. */
  staff: Map<string, StaffRendered>;
};

export function SectionRenderer({
  payload,
  ctx,
  nested = false,
}: {
  payload: MinistrySectionPayload;
  ctx: RenderContext;
  /** True when rendered inside a Columns block — tightens spacing. */
  nested?: boolean;
}) {
  return (
    <section
      id={payload.kind === "heading" ? payload.header.anchorId : payload.header?.anchorId}
      className={nested ? "" : "mb-12 last:mb-0"}
    >
      {renderInner(payload, ctx)}
    </section>
  );
}

function HeaderEl({
  header,
  level = 2,
}: {
  header?: SectionHeader;
  level?: 2 | 3;
}) {
  if (!header || (!header.heading && !header.subheading)) return null;
  const Tag = level === 3 ? "h3" : "h2";
  return (
    <header className="mb-4">
      {header.heading && (
        <Tag
          className={
            level === 3
              ? "font-serif text-xl font-bold text-navy"
              : "font-serif text-2xl font-bold text-navy"
          }
        >
          {header.heading}
        </Tag>
      )}
      {header.subheading && (
        <p className="mt-1 text-sm text-ink-2">{header.subheading}</p>
      )}
    </header>
  );
}

function renderInner(p: MinistrySectionPayload, ctx: RenderContext): React.ReactNode {
  switch (p.kind) {
    case "heading":
      return <HeaderEl header={p.header} level={p.level ?? 2} />;

    case "rich_text":
      return (
        <>
          <HeaderEl header={p.header} />
          <div className="sh-prose">
            <RichTextRenderer html={p.html} />
          </div>
        </>
      );

    case "image": {
      const url = ctx.images.get(p.blobKey);
      const inner = url ? (
        <Image
          src={url}
          alt={p.alt ?? ""}
          width={1200}
          height={800}
          className="h-auto w-full rounded-lg"
        />
      ) : null;
      return (
        <>
          <HeaderEl header={p.header} />
          {p.href && inner ? (
            <a href={p.href} target="_blank" rel="noopener noreferrer">
              {inner}
            </a>
          ) : (
            inner
          )}
          {p.caption && (
            <p className="mt-2 text-center text-xs text-ink-3">{p.caption}</p>
          )}
        </>
      );
    }

    case "image_text": {
      const url = ctx.images.get(p.blobKey);
      const imageEl = url && (
        <div className="overflow-hidden rounded-lg">
          <Image
            src={url}
            alt={p.alt ?? ""}
            width={800}
            height={600}
            className="h-auto w-full"
          />
        </div>
      );
      const textEl = (
        <div className="sh-prose">
          <RichTextRenderer html={p.html} />
        </div>
      );
      const reverse = p.imageSide === "right";
      return (
        <>
          <HeaderEl header={p.header} />
          <div
            className={`grid gap-8 md:grid-cols-2 md:items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
          >
            {imageEl}
            {textEl}
          </div>
        </>
      );
    }

    case "image_gallery": {
      const cols = p.columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 md:grid-cols-3";
      return (
        <>
          <HeaderEl header={p.header} />
          <ul className={`grid gap-4 ${cols}`}>
            {p.images.map((img, i) => {
              const url = ctx.images.get(img.blobKey);
              if (!url) return null;
              return (
                <li key={i}>
                  <div className="overflow-hidden rounded-lg">
                    <Image
                      src={url}
                      alt={img.alt ?? ""}
                      width={600}
                      height={400}
                      className="h-auto w-full"
                    />
                  </div>
                  {img.caption && (
                    <p className="mt-1 text-center text-xs text-ink-3">{img.caption}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      );
    }

    case "link_list":
      return (
        <>
          <HeaderEl header={p.header} />
          <ul className="space-y-1">
            {p.items.map((l, i) => (
              <li key={i}>
                <a
                  href={l.href}
                  target={isExternal(l.href) ? "_blank" : undefined}
                  rel={isExternal(l.href) ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-2 rounded-md py-1 text-rust-dark hover:text-rust"
                >
                  {iconForHint(l.iconHint, l.href)}
                  <span className="underline-offset-2 hover:underline">{l.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      );

    case "button_group":
      return (
        <>
          <HeaderEl header={p.header} />
          <div className="flex flex-wrap gap-3">
            {p.items.map((b, i) => (
              <a
                key={i}
                href={b.href}
                target={isExternal(b.href) ? "_blank" : undefined}
                rel={isExternal(b.href) ? "noopener noreferrer" : undefined}
                className={
                  b.variant === "secondary"
                    ? "inline-flex items-center rounded-pill border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy"
                    : "inline-flex items-center rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark"
                }
              >
                {b.label}
              </a>
            ))}
          </div>
        </>
      );

    case "video": {
      const poster = p.posterBlobKey ? ctx.images.get(p.posterBlobKey) ?? undefined : undefined;
      return (
        <>
          <HeaderEl header={p.header} />
          <VideoBlock url={p.url} type={p.type} poster={poster} />
          {p.caption && (
            <p className="mt-2 text-center text-xs text-ink-3">{p.caption}</p>
          )}
        </>
      );
    }

    case "card_grid": {
      const cols = p.columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 md:grid-cols-3";
      return (
        <>
          <HeaderEl header={p.header} />
          <ul className={`grid gap-6 ${cols}`}>
            {p.cards.map((c, i) => {
              const url = c.imageBlobKey ? ctx.images.get(c.imageBlobKey) ?? null : null;
              const inner = (
                <article className="group overflow-hidden rounded-lg border border-rule bg-white transition-all hover:-translate-y-1 hover:shadow-hover">
                  {url ? (
                    <Image
                      src={url}
                      alt={c.title}
                      width={600}
                      height={400}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-navy to-navy-dark" />
                  )}
                  <div className="p-5">
                    <h4 className="font-serif text-base font-bold text-navy group-hover:text-rust-dark">
                      {c.title}
                    </h4>
                    {c.summary && (
                      <p className="mt-2 text-sm text-ink-2">{c.summary}</p>
                    )}
                  </div>
                </article>
              );
              return (
                <li key={i}>
                  {c.href ? (
                    <a
                      href={c.href}
                      target={isExternal(c.href) ? "_blank" : undefined}
                      rel={isExternal(c.href) ? "noopener noreferrer" : undefined}
                    >
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        </>
      );
    }

    case "embed":
      return (
        <>
          <HeaderEl header={p.header} />
          <EmbedRender embed={p.embed} />
        </>
      );

    case "staff_card": {
      const s = ctx.staff.get(p.staffId);
      if (!s) return null;
      const photoUrl = s.photoBlobKey ? ctx.images.get(s.photoBlobKey) ?? null : null;
      return (
        <>
          <HeaderEl header={p.header} />
          <div className="flex flex-wrap items-center gap-6 rounded-lg border border-rule bg-cream/40 p-6">
            <div className="size-24 overflow-hidden rounded-full bg-navy/10">
              {photoUrl && (
                <Image
                  src={photoUrl}
                  alt={s.name}
                  width={200}
                  height={200}
                  className="size-full object-cover"
                />
              )}
            </div>
            <div className="flex-1">
              <p className="font-serif text-xl font-bold text-navy">{s.name}</p>
              {s.role && <p className="text-sm text-ink-2">{s.role}</p>}
              {!p.hideContact && s.email && (
                <p className="mt-2 font-mono text-xs">
                  <a
                    href={`mailto:${encodeURIComponent(s.email)}`}
                    className="text-rust-dark hover:text-rust"
                  >
                    {s.email}
                  </a>
                </p>
              )}
            </div>
          </div>
        </>
      );
    }

    case "callout_banner": {
      const url = p.imageBlobKey ? ctx.images.get(p.imageBlobKey) ?? null : null;
      const toneClass =
        p.tone === "warm"
          ? "from-rust to-rust-dark text-white"
          : p.tone === "gold"
            ? "from-gold/30 to-rust-pale text-ink"
            : "from-navy to-navy-dark text-white";
      const onDark = p.tone !== "gold";
      return (
        <>
          <HeaderEl header={p.header} />
          <div
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br p-8 md:p-10 ${toneClass} ${onDark ? "sh-on-dark" : ""}`}
          >
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                {p.tag && (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-85">
                    {p.tag}
                  </span>
                )}
                <h3 className="mt-2 font-serif text-2xl font-bold">{p.title}</h3>
                {p.body && <p className="mt-2 max-w-[60ch] opacity-85">{p.body}</p>}
                {p.ctaLabel && p.ctaHref && (
                  <a
                    href={p.ctaHref}
                    target={isExternal(p.ctaHref) ? "_blank" : undefined}
                    rel={isExternal(p.ctaHref) ? "noopener noreferrer" : undefined}
                    className="mt-5 inline-flex items-center gap-2 rounded-pill bg-white/15 px-5 py-2.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/25"
                  >
                    {p.ctaLabel}
                    <span aria-hidden="true">→</span>
                  </a>
                )}
              </div>
              {url && (
                <Image
                  src={url}
                  alt=""
                  width={300}
                  height={200}
                  className="hidden h-auto w-[200px] rounded-lg md:block"
                />
              )}
            </div>
          </div>
        </>
      );
    }

    case "columns": {
      const ratio =
        p.ratio === "60-40"
          ? "md:grid-cols-[1.5fr_1fr]"
          : p.ratio === "40-60"
            ? "md:grid-cols-[1fr_1.5fr]"
            : `md:grid-cols-${p.columns.length}`;
      return (
        <>
          <HeaderEl header={p.header} />
          <div className={`grid gap-8 ${ratio}`}>
            {p.columns.map((col, ci) => (
              <div key={ci} className="space-y-6">
                {col.blocks.map((b, bi) => (
                  // Leaf blocks only inside columns — cast to the union
                  // so the SectionRenderer's switch handles them.
                  <SectionRenderer
                    key={bi}
                    payload={b as MinistrySectionPayload}
                    ctx={ctx}
                    nested
                  />
                ))}
              </div>
            ))}
          </div>
        </>
      );
    }
  }
}

function isExternal(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

function iconForHint(
  hint: "external" | "pdf" | "form" | "video" | "calendar" | undefined,
  href: string,
): React.ReactNode {
  const inferred =
    hint ??
    (href.endsWith(".pdf")
      ? "pdf"
      : href.includes("forms.google") || href.includes("docs.google")
        ? "form"
        : href.startsWith("http")
          ? "external"
          : undefined);
  if (!inferred) return null;
  const icons: Record<string, React.ReactNode> = {
    pdf: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M14 3v4a2 2 0 0 0 2 2h4M5 21V3a2 2 0 0 1 2-2h7l6 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
      </svg>
    ),
    external: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
      </svg>
    ),
    form: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    video: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    calendar: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  };
  return icons[inferred] ?? null;
}

function EmbedRender({ embed }: { embed: EmbedPayload }) {
  const baseClass =
    "w-full overflow-hidden rounded-lg border border-rule bg-black/5 aspect-video";
  switch (embed.provider) {
    case "youtube":
      return (
        <div className={baseClass}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${embed.videoId}`}
            title={embed.title ?? "YouTube video"}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </div>
      );
    case "vimeo":
      return (
        <div className={baseClass}>
          <iframe
            src={`https://player.vimeo.com/video/${embed.videoId}`}
            title={embed.title ?? "Vimeo video"}
            loading="lazy"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </div>
      );
    case "bunny":
      return (
        <div className={baseClass}>
          <iframe
            src={embed.url}
            title={embed.title ?? "Video"}
            loading="lazy"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="size-full"
          />
        </div>
      );
    case "google_form":
    case "signupgenius":
    case "eventbrite":
    case "touchpoint":
    case "iframe": {
      const height =
        embed.provider === "iframe" ? embed.height ?? 700 : 700;
      return (
        <div className="overflow-hidden rounded-lg border border-rule bg-white">
          <iframe
            src={embed.url}
            title={embed.title ?? "Embedded content"}
            loading="lazy"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{ width: "100%", height: `${height}px`, border: 0 }}
          />
        </div>
      );
    }
  }
}
