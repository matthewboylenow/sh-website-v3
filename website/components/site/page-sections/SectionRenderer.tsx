import Link from "next/link";
import Image from "next/image";
import type {
  Event as EventRow,
  Ministry as MinistryRow,
  PageSectionPayload,
  SectionHeader,
  EmbedPayload,
} from "@/db/schema";
import { EventCard } from "@/components/site/EventCard";
import { MinistryCard } from "@/components/site/MinistryCard";
import { RichTextRenderer } from "@/components/site/RichTextRenderer";
import { IconRender } from "@/components/site/IconRender";
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

/** Pre-resolved data for the featured_ministries block. The renderer
 *  picks up to N from this list per the block's `mode` and `count`. */
export type FeaturedMinistriesData = {
  /** All published ministries with the fields cards need. */
  spotlight: MinistryRow[];
  /** Map keyed by id for O(1) `manual` lookup. */
  byId: Map<string, MinistryRow>;
};

/** Pre-resolved data for the featured_events block. */
export type FeaturedEventsData = {
  /** Already-expanded upcoming event instances within the horizon. */
  instances: Array<
    EventRow & { occurrenceStartsAt: Date; occurrenceEndsAt: Date }
  >;
};

export type RenderContext = {
  /** blobKey → public URL. Missing keys are absent from the map. */
  images: Map<string, string>;
  /** staffId → public-shape staff row. */
  staff: Map<string, StaffRendered>;
  /** Optional — only resolved when at least one featured_ministries block exists. */
  featuredMinistries?: FeaturedMinistriesData;
  /** Optional — only resolved when at least one featured_events block exists. */
  featuredEvents?: FeaturedEventsData;
};

export function SectionRenderer({
  payload,
  ctx,
  nested = false,
}: {
  payload: PageSectionPayload;
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
  if (!header || (!header.heading && !header.subheading && !header.eyebrow))
    return null;
  const Tag = level === 3 ? "h3" : "h2";
  const isCenter = header.align === "center";
  // Display style: clamped serif title + rust rule + lede; mirrors
  // SectionHead from the original mockup.
  const wrapClass =
    "mb-6 max-w-[60ch] " + (isCenter ? "mx-auto text-center" : "");
  const titleClass =
    level === 3
      ? "font-serif text-xl font-bold text-navy [.sh-on-dark_&]:text-white"
      : "font-serif font-bold text-navy [.sh-on-dark_&]:text-white text-[clamp(28px,3.2vw,40px)] leading-tight";
  const ruleClass =
    "mt-3 inline-block h-[3px] w-14 rounded-sm bg-rust [.sh-on-dark_&]:bg-gold";
  return (
    <header className={wrapClass}>
      {header.eyebrow && (
        <span className="mb-1 block font-sans text-xs font-semibold uppercase tracking-[0.14em] text-rust [.sh-on-dark_&]:text-gold">
          {header.eyebrow}
        </span>
      )}
      {header.heading && (
        <Tag id={header.anchorId} className={titleClass}>
          {header.heading}
        </Tag>
      )}
      {header.heading && level === 2 && (
        <span className={ruleClass} aria-hidden="true" />
      )}
      {header.subheading && (
        <p className="mt-3 text-[17px] leading-snug text-ink-2 [.sh-on-dark_&]:text-white/80">
          {header.subheading}
        </p>
      )}
    </header>
  );
}

function renderInner(p: PageSectionPayload, ctx: RenderContext): React.ReactNode {
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
      const url = p.blobKey ? ctx.images.get(p.blobKey) : undefined;
      // Hide the whole block (header included) when no image bound — keeps
      // an in-progress page from showing an orphan caption.
      if (!url) return null;
      const inner = (
        <Image
          src={url}
          alt={p.alt ?? ""}
          width={1200}
          height={800}
          className="h-auto w-full rounded-lg"
        />
      );
      return (
        <>
          <HeaderEl header={p.header} />
          {p.href ? (
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
      const url = p.blobKey ? ctx.images.get(p.blobKey) : undefined;
      const textEl = (
        <div className="sh-prose">
          <RichTextRenderer html={p.html} />
        </div>
      );
      // No image bound yet — render text full-width so the block stays
      // useful while the image is still being uploaded.
      if (!url) {
        return (
          <>
            <HeaderEl header={p.header} />
            {textEl}
          </>
        );
      }
      const imageEl = (
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
      const cardStyle = p.cardStyle ?? "stacked";

      // Bento: first 2 cards = large image-prominent, rest = compact 4-up.
      // Falls back to uniform when fewer than 3 cards (no compact tier
      // would render anyway).
      if (p.layout === "bento" && p.cards.length >= 3) {
        const heroes = p.cards.slice(0, 2);
        const tiles = p.cards.slice(2);
        const tileCols =
          tiles.length >= 4
            ? "sm:grid-cols-2 lg:grid-cols-4"
            : `sm:grid-cols-${Math.min(tiles.length, 3)}`;
        return (
          <>
            <HeaderEl header={p.header} />
            <ul className="grid gap-5 md:grid-cols-2">
              {heroes.map((c, i) => (
                <li key={`hero-${i}`}>
                  <BentoHeroCard
                    card={c}
                    imageUrl={c.imageBlobKey ? ctx.images.get(c.imageBlobKey) ?? null : null}
                    style={cardStyle}
                  />
                </li>
              ))}
            </ul>
            {/* Tiles always stay stacked — overlay reads poorly at small sizes. */}
            <ul className={`mt-5 grid gap-4 ${tileCols}`}>
              {tiles.map((c, i) => (
                <li key={`tile-${i}`}>
                  <BentoTileCard
                    card={c}
                    imageUrl={c.imageBlobKey ? ctx.images.get(c.imageBlobKey) ?? null : null}
                    /* Alternate accent so the row has visual rhythm. */
                    accent={i % 4 === 2 ? "navy" : "default"}
                  />
                </li>
              ))}
            </ul>
          </>
        );
      }

      const cols = p.columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 md:grid-cols-3";
      return (
        <>
          <HeaderEl header={p.header} />
          <ul className={`grid gap-6 ${cols}`}>
            {p.cards.map((c, i) => (
              <li key={i}>
                <UniformCard
                  card={c}
                  imageUrl={c.imageBlobKey ? ctx.images.get(c.imageBlobKey) ?? null : null}
                  style={cardStyle}
                />
              </li>
            ))}
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

    case "featured_ministries": {
      const data = ctx.featuredMinistries;
      if (!data) return null;
      const onNavy = p.tone === "navy";
      const picks = pickMinistries(p, data);
      const innerCols =
        picks.length >= 3
          ? "md:grid-cols-2 lg:grid-cols-3"
          : "md:grid-cols-2";
      return (
        <div className={onNavy ? "sh-on-dark -mx-4 rounded-xl bg-navy px-6 py-12 sm:-mx-6 sm:px-10 sm:py-16" : ""}>
          {p.header && (p.header.heading || p.header.subheading) ? (
            <header className="mb-8 max-w-[60ch]">
              {p.header.heading && (
                <h2 className="font-serif text-2xl font-bold text-navy [.sh-on-dark_&]:text-white">
                  {p.header.heading}
                </h2>
              )}
              {p.header.subheading && (
                <p className="mt-2 text-sm text-ink-2 [.sh-on-dark_&]:text-white/85">
                  {p.header.subheading}
                </p>
              )}
            </header>
          ) : null}
          {picks.length === 0 ? (
            <p className="text-sm text-ink-3">No ministries to feature.</p>
          ) : (
            <ul className={`grid gap-6 ${innerCols}`}>
              {picks.map((m) => {
                const imageUrl = m.photoBlobKey ? ctx.images.get(m.photoBlobKey) ?? null : null;
                return (
                  <li key={m.id}>
                    <MinistryCard
                      ministry={m}
                      tone={onNavy ? "on-navy" : "on-cream"}
                      imageUrl={imageUrl}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          {p.ctaLabel && p.ctaHref && (
            <div className="mt-8">
              <Link
                href={p.ctaHref}
                className={
                  onNavy
                    ? "inline-flex items-center rounded-pill border border-white/30 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                    : "inline-flex items-center rounded-pill border border-rule bg-white px-6 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy"
                }
              >
                {p.ctaLabel} <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </div>
      );
    }

    case "featured_events": {
      const data = ctx.featuredEvents;
      if (!data) return null;
      const filtered = p.category
        ? data.instances.filter((e) =>
            (e.categories ?? []).includes(p.category as string),
          )
        : data.instances;
      const picks = filtered.slice(0, p.count);
      return (
        <>
          {p.header && (p.header.heading || p.header.subheading) ? (
            <header className="mb-8 max-w-[60ch]">
              {p.header.heading && (
                <h2 className="font-serif text-2xl font-bold text-navy">
                  {p.header.heading}
                </h2>
              )}
              {p.header.subheading && (
                <p className="mt-2 text-sm text-ink-2">{p.header.subheading}</p>
              )}
            </header>
          ) : null}
          {picks.length === 0 ? (
            <p className="text-sm text-ink-3">No upcoming events.</p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {picks.map((e) => {
                const imageUrl = e.photoBlobKey ? ctx.images.get(e.photoBlobKey) ?? null : null;
                return (
                  <li key={`${e.id}-${e.occurrenceStartsAt.toISOString()}`}>
                    <EventCard
                      event={{
                        slug: e.slug,
                        title: e.title,
                        startsAt: e.occurrenceStartsAt,
                        photoBlobKey: e.photoBlobKey,
                        audiences: e.audiences,
                        categories: e.categories,
                      }}
                      imageUrl={imageUrl}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          {p.ctaLabel && p.ctaHref && (
            <div className="mt-8">
              <Link
                href={p.ctaHref}
                className="inline-flex items-center rounded-pill border border-rule bg-white px-6 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy"
              >
                {p.ctaLabel} <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </>
      );
    }

    case "podcast_episode": {
      const provider = detectPodcastProvider(p.url);
      const playerSrc =
        provider === "spotify"
          ? spotifyEmbedSrc(p.url)
          : provider === "apple"
            ? applePodcastsEmbedSrc(p.url)
            : p.url;
      const playerHeight = provider === "apple" ? 175 : 232;
      const subscribeIsExternal =
        !!p.subscribeHref && /^https?:\/\//.test(p.subscribeHref);
      return (
        <div className="rounded-2xl border border-rule bg-cream/40 p-6 md:p-8">
          {p.showLabel && (
            <span className="sh-eyebrow">{p.showLabel}</span>
          )}
          {p.header && (p.header.heading || p.header.subheading) ? (
            <header className="mt-2 mb-4">
              {p.header.heading && (
                <h2 className="font-serif text-2xl font-bold text-navy">
                  {p.header.heading}
                </h2>
              )}
              {p.header.subheading && (
                <p className="mt-1 text-sm text-ink-2">{p.header.subheading}</p>
              )}
            </header>
          ) : null}
          {p.description && (
            <p className="mb-4 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
              {p.description}
            </p>
          )}
          <div className="overflow-hidden rounded-xl border border-rule bg-white">
            <iframe
              src={playerSrc}
              title={p.header?.heading ?? "Podcast episode"}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
              referrerPolicy="strict-origin-when-cross-origin"
              style={{ width: "100%", height: `${playerHeight}px`, border: 0 }}
            />
          </div>
          {p.subscribeLabel && p.subscribeHref && (
            <div className="mt-5">
              <a
                href={p.subscribeHref}
                target={subscribeIsExternal ? "_blank" : undefined}
                rel={subscribeIsExternal ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-2 rounded-pill border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy"
              >
                {p.subscribeLabel} <span aria-hidden="true">→</span>
              </a>
            </div>
          )}
        </div>
      );
    }

    case "pastor_welcome": {
      const photoUrl = p.photoBlobKey
        ? ctx.images.get(p.photoBlobKey) ?? null
        : null;
      const reverse = p.mediaSide === "right";
      const hasVideo = !!p.videoUrl && !!p.videoType;
      const mediaEl = hasVideo ? (
        <div className="overflow-hidden rounded-2xl border border-rule">
          <VideoBlock
            url={p.videoUrl!}
            type={p.videoType!}
            poster={photoUrl ?? undefined}
          />
        </div>
      ) : photoUrl ? (
        <div className="overflow-hidden rounded-2xl border border-rule">
          <Image
            src={photoUrl}
            alt={p.photoAlt ?? p.signatureName ?? "Pastor"}
            width={900}
            height={1100}
            className="h-auto w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[4/5] rounded-2xl border border-dashed border-rule bg-cream/40" />
      );
      const textEl = (
        <div>
          <div className="sh-prose">
            <RichTextRenderer html={p.html} />
          </div>
          {(p.signatureName || p.signatureRole) && (
            <div className="mt-6 border-t border-rule pt-4">
              {p.signatureName && (
                <p className="font-serif text-lg font-bold text-navy [.sh-on-dark_&]:text-white">
                  {p.signatureName}
                </p>
              )}
              {p.signatureRole && (
                <p className="text-sm text-ink-2 [.sh-on-dark_&]:text-white/80">
                  {p.signatureRole}
                </p>
              )}
            </div>
          )}
        </div>
      );
      return (
        <>
          <HeaderEl header={p.header} />
          <div
            className={`grid gap-8 md:grid-cols-[5fr_7fr] md:items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
          >
            {mediaEl}
            {textEl}
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
                    payload={b as PageSectionPayload}
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

type CardData = {
  title: string;
  summary?: string;
  href?: string;
  imageBlobKey?: string | null;
  ctaLabel?: string;
};

function BentoHeroCard({
  card,
  imageUrl,
  style,
}: {
  card: CardData;
  imageUrl: string | null;
  style: "stacked" | "overlay";
}) {
  const inner =
    style === "overlay" ? (
      <article className="group relative block aspect-[16/10] h-full overflow-hidden rounded-lg shadow-md transition-all hover:-translate-y-1 hover:shadow-hover">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={card.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy to-navy-dark" />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10"
        />
        <div className="sh-on-dark absolute inset-x-0 bottom-0 p-7 md:p-8">
          <h3 className="font-serif text-2xl font-bold text-white drop-shadow-md md:text-3xl">
            {card.title}
          </h3>
          {card.summary && (
            <p className="mt-2 max-w-[40ch] text-white/90 drop-shadow">
              {card.summary}
            </p>
          )}
          {card.ctaLabel && (
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors group-hover:bg-rust">
              {card.ctaLabel} <span aria-hidden="true">→</span>
            </span>
          )}
        </div>
      </article>
    ) : (
      <article className="group block h-full overflow-hidden rounded-lg border border-rule bg-white transition-all hover:-translate-y-1 hover:shadow-hover">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={card.title}
            width={1200}
            height={675}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-navy to-navy-dark" />
        )}
        <div className="p-7 md:p-8">
          <h3 className="font-serif text-2xl font-bold text-navy group-hover:text-rust-dark">
            {card.title}
          </h3>
          {card.summary && <p className="mt-2 text-ink-2">{card.summary}</p>}
          {card.ctaLabel && (
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rust-dark group-hover:text-rust">
              {card.ctaLabel} <span aria-hidden="true">→</span>
            </span>
          )}
        </div>
      </article>
    );
  return card.href ? (
    <a
      href={card.href}
      target={isExternal(card.href) ? "_blank" : undefined}
      rel={isExternal(card.href) ? "noopener noreferrer" : undefined}
      className="block h-full"
    >
      {inner}
    </a>
  ) : (
    inner
  );
}

function UniformCard({
  card,
  imageUrl,
  style,
}: {
  card: CardData;
  imageUrl: string | null;
  style: "stacked" | "overlay";
}) {
  const inner =
    style === "overlay" ? (
      <article className="group relative block aspect-[4/5] h-full overflow-hidden rounded-lg shadow-md transition-all hover:-translate-y-1 hover:shadow-hover">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={card.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy to-navy-dark" />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10"
        />
        <div className="sh-on-dark absolute inset-x-0 bottom-0 p-5">
          <h4 className="font-serif text-xl font-bold text-white drop-shadow-md">
            {card.title}
          </h4>
          {card.summary && (
            <p className="mt-1.5 text-sm text-white/90 drop-shadow">
              {card.summary}
            </p>
          )}
          {card.ctaLabel && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-colors group-hover:bg-rust">
              {card.ctaLabel} <span aria-hidden="true">→</span>
            </span>
          )}
        </div>
      </article>
    ) : (
      <article className="group h-full overflow-hidden rounded-lg border border-rule bg-white transition-all hover:-translate-y-1 hover:shadow-hover">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={card.title}
            width={600}
            height={400}
            className="h-48 w-full object-cover"
          />
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-navy to-navy-dark" />
        )}
        <div className="p-5">
          <h4 className="font-serif text-base font-bold text-navy group-hover:text-rust-dark">
            {card.title}
          </h4>
          {card.summary && (
            <p className="mt-2 text-sm text-ink-2">{card.summary}</p>
          )}
          {card.ctaLabel && (
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-rust-dark group-hover:text-rust">
              {card.ctaLabel} <span aria-hidden="true">→</span>
            </span>
          )}
        </div>
      </article>
    );
  return card.href ? (
    <a
      href={card.href}
      target={isExternal(card.href) ? "_blank" : undefined}
      rel={isExternal(card.href) ? "noopener noreferrer" : undefined}
      className="block h-full"
    >
      {inner}
    </a>
  ) : (
    inner
  );
}

function BentoTileCard({
  card,
  imageUrl,
  accent,
}: {
  card: {
    title: string;
    summary?: string;
    href?: string;
    imageBlobKey?: string | null;
    iconName?: string | null;
  };
  imageUrl: string | null;
  accent: "default" | "navy";
}) {
  const wrapClass =
    accent === "navy"
      ? "sh-on-dark group block h-full rounded-lg border border-navy/15 bg-navy p-5 text-white transition-all hover:-translate-y-1 hover:shadow-hover"
      : "group block h-full rounded-lg border border-rule bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-hover";
  // Precedence: icon > image > placeholder arrow.
  const iconBubbleClass =
    "mb-3 flex size-12 items-center justify-center rounded-md " +
    (accent === "navy" ? "bg-white/10 text-gold" : "bg-navy-pale text-navy");
  const inner = (
    <article className={wrapClass}>
      {card.iconName ? (
        <div className={iconBubbleClass} aria-hidden="true">
          <IconRender name={card.iconName} size={24} />
        </div>
      ) : imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          width={120}
          height={120}
          className="mb-3 size-12 rounded-md object-cover"
        />
      ) : (
        <div className={iconBubbleClass} aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      )}
      <h4
        className={
          "font-serif text-base font-bold " +
          (accent === "navy"
            ? "text-white group-hover:text-gold"
            : "text-navy group-hover:text-rust-dark")
        }
      >
        {card.title}
      </h4>
      {card.summary && (
        <p
          className={
            "mt-1 text-sm " +
            (accent === "navy" ? "text-white/80" : "text-ink-3")
          }
        >
          {card.summary}
        </p>
      )}
    </article>
  );
  return card.href ? (
    <a
      href={card.href}
      target={isExternal(card.href) ? "_blank" : undefined}
      rel={isExternal(card.href) ? "noopener noreferrer" : undefined}
      className="block h-full"
    >
      {inner}
    </a>
  ) : (
    inner
  );
}

function detectPodcastProvider(url: string): "spotify" | "apple" | "other" {
  const lower = url.toLowerCase();
  if (lower.includes("spotify.com")) return "spotify";
  if (lower.includes("podcasts.apple.com")) return "apple";
  return "other";
}

function spotifyEmbedSrc(url: string): string {
  // Accept both player URLs (https://open.spotify.com/episode/<id>) and
  // already-embed URLs (https://open.spotify.com/embed/episode/<id>).
  if (url.includes("/embed/")) return url;
  return url.replace("open.spotify.com/", "open.spotify.com/embed/");
}

function applePodcastsEmbedSrc(url: string): string {
  // Apple uses subdomain `embed.podcasts.apple.com` for iframes. If the
  // user pasted a regular `podcasts.apple.com` URL, swap it.
  if (url.startsWith("https://embed.")) return url;
  return url.replace("https://podcasts.apple.com", "https://embed.podcasts.apple.com");
}

function pickMinistries(
  block: Extract<PageSectionPayload, { kind: "featured_ministries" }>,
  data: FeaturedMinistriesData,
): MinistryRow[] {
  const count = Math.max(1, block.count);
  if (block.mode === "manual") {
    const ids = block.ministryIds ?? [];
    return ids
      .map((id) => data.byId.get(id))
      .filter((m): m is MinistryRow => Boolean(m))
      .slice(0, count);
  }
  if (block.mode === "random") {
    // Re-shuffle each render. Caching at the page level (`revalidate`)
    // freezes the result for a window, which is fine for "feels different
    // sometimes" without thrashing.
    const pool = [...data.spotlight];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, count);
  }
  // spotlight: respect orderingPriority + name (already pre-sorted)
  return data.spotlight.slice(0, count);
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
    case "spotify":
      return (
        <div className="w-full overflow-hidden rounded-xl border border-rule bg-black/5">
          <iframe
            src={spotifyEmbedSrc(embed.url)}
            title={embed.title ?? "Spotify"}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ width: "100%", height: "232px", border: 0 }}
          />
        </div>
      );
    case "apple_podcasts":
      return (
        <div className="w-full overflow-hidden rounded-xl border border-rule bg-black/5">
          <iframe
            src={applePodcastsEmbedSrc(embed.url)}
            title={embed.title ?? "Apple Podcasts"}
            loading="lazy"
            allow="autoplay; encrypted-media"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
            style={{ width: "100%", height: "175px", border: 0 }}
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
