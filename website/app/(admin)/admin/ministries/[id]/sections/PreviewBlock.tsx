"use client";

import type {
  EmbedPayload,
  PageLeafBlock,
  PageSectionPayload,
  SectionHeader,
} from "@/db/schema";
import { VideoBlock } from "@/components/site/page-sections/VideoBlock";

/**
 * Client-side mirror of the public SectionRenderer for in-editor preview.
 * Uses regular <img> instead of next/image (no remote-pattern config to
 * worry about in admin context) and consumes a flat imgUrls map. The
 * design tokens come through the shared CSS so styling matches the
 * public site one-to-one.
 */

type StaffOption = {
  id: string;
  name: string;
  role: string | null;
  email?: string | null;
  photoBlobKey?: string | null;
};

export function PreviewBlock({
  payload,
  imgUrls,
  staffOptions,
  nested = false,
}: {
  payload: PageSectionPayload;
  imgUrls: Record<string, string>;
  staffOptions: StaffOption[];
  nested?: boolean;
}) {
  return (
    <div className={nested ? "" : "rounded-md border border-rule bg-cream/30 p-5"}>
      {!nested && (
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          Preview
        </p>
      )}
      <div>{renderInner(payload, imgUrls, staffOptions)}</div>
    </div>
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

function renderInner(
  p: PageSectionPayload,
  imgUrls: Record<string, string>,
  staffOptions: StaffOption[],
): React.ReactNode {
  switch (p.kind) {
    case "heading":
      return <HeaderEl header={p.header} level={p.level ?? 2} />;

    case "rich_text":
      return (
        <>
          <HeaderEl header={p.header} />
          <div className="sh-prose" dangerouslySetInnerHTML={{ __html: p.html || "<p class=\"text-ink-3\">No content.</p>" }} />
        </>
      );

    case "image": {
      const url = imgUrls[p.blobKey];
      const inner = url ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview
        <img src={url} alt={p.alt ?? ""} className="h-auto w-full rounded-lg" />
      ) : (
        <Placeholder label="Image" />
      );
      return (
        <>
          <HeaderEl header={p.header} />
          {p.href && url ? (
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
      const url = imgUrls[p.blobKey];
      const reverse = p.imageSide === "right";
      return (
        <>
          <HeaderEl header={p.header} />
          <div className={`grid gap-8 md:grid-cols-2 md:items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
            <div className="overflow-hidden rounded-lg">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={p.alt ?? ""} className="h-auto w-full" />
              ) : (
                <Placeholder label="Image" />
              )}
            </div>
            <div className="sh-prose" dangerouslySetInnerHTML={{ __html: p.html || "<p class=\"text-ink-3\">No content.</p>" }} />
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
              const url = imgUrls[img.blobKey];
              return (
                <li key={i}>
                  <div className="overflow-hidden rounded-lg">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={img.alt ?? ""} className="h-auto w-full" />
                    ) : (
                      <Placeholder label="Image" />
                    )}
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
                  href={l.href || "#"}
                  className="inline-flex items-center gap-2 rounded-md py-1 text-rust-dark hover:text-rust"
                >
                  <span className="underline-offset-2 hover:underline">
                    {l.label || <em className="text-ink-3">Empty link</em>}
                  </span>
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
                href={b.href || "#"}
                className={
                  b.variant === "secondary"
                    ? "inline-flex items-center rounded-pill border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy"
                    : "inline-flex items-center rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
                }
              >
                {b.label || <em>Untitled</em>}
              </a>
            ))}
          </div>
        </>
      );

    case "video": {
      const poster = p.posterBlobKey ? imgUrls[p.posterBlobKey] : undefined;
      return (
        <>
          <HeaderEl header={p.header} />
          {p.url ? (
            <VideoBlock url={p.url} type={p.type} poster={poster} />
          ) : (
            <Placeholder label="Video" />
          )}
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
              const url = c.imageBlobKey ? imgUrls[c.imageBlobKey] : null;
              return (
                <li
                  key={i}
                  className="overflow-hidden rounded-lg border border-rule bg-white"
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={c.title} className="h-48 w-full object-cover" />
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-navy to-navy-dark" />
                  )}
                  <div className="p-5">
                    <h4 className="font-serif text-base font-bold text-navy">
                      {c.title || <em>Untitled card</em>}
                    </h4>
                    {c.summary && <p className="mt-2 text-sm text-ink-2">{c.summary}</p>}
                  </div>
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
          <EmbedPreview embed={p.embed} />
        </>
      );

    case "staff_card": {
      const s = staffOptions.find((x) => x.id === p.staffId);
      if (!s) {
        return (
          <>
            <HeaderEl header={p.header} />
            <Placeholder label="Pick a staff member" />
          </>
        );
      }
      const photo = s.photoBlobKey ? imgUrls[s.photoBlobKey] : null;
      return (
        <>
          <HeaderEl header={p.header} />
          <div className="flex flex-wrap items-center gap-6 rounded-lg border border-rule bg-cream/40 p-6">
            <div className="size-24 overflow-hidden rounded-full bg-navy/10">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={s.name} className="size-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-serif text-xl font-bold text-navy">{s.name}</p>
              {s.role && <p className="text-sm text-ink-2">{s.role}</p>}
              {!p.hideContact && s.email && (
                <p className="mt-2 font-mono text-xs text-rust-dark">{s.email}</p>
              )}
            </div>
          </div>
        </>
      );
    }

    case "callout_banner": {
      const url = p.imageBlobKey ? imgUrls[p.imageBlobKey] : null;
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
                <h3 className="mt-2 font-serif text-2xl font-bold">
                  {p.title || <em>Untitled banner</em>}
                </h3>
                {p.body && <p className="mt-2 max-w-[60ch] opacity-85">{p.body}</p>}
                {p.ctaLabel && p.ctaHref && (
                  <span className="mt-5 inline-flex items-center gap-2 rounded-pill bg-white/15 px-5 py-2.5 text-sm font-semibold backdrop-blur">
                    {p.ctaLabel} <span aria-hidden="true">→</span>
                  </span>
                )}
              </div>
              {url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="hidden h-auto w-[200px] rounded-lg md:block" />
              )}
            </div>
          </div>
        </>
      );
    }

    case "featured_ministries":
      return (
        <>
          <HeaderEl header={p.header} />
          <div className="rounded-md border border-dashed border-rule bg-cream/40 p-4 text-xs text-ink-3">
            <strong className="text-navy">Featured ministries</strong> · mode:{" "}
            <code>{p.mode}</code> · count: {p.count}
            {p.tone === "navy" && " · on-navy bg"}
            <p className="mt-1 text-[11px]">
              Live data renders only on the public page; this is an admin preview.
            </p>
          </div>
        </>
      );

    case "featured_events":
      return (
        <>
          <HeaderEl header={p.header} />
          <div className="rounded-md border border-dashed border-rule bg-cream/40 p-4 text-xs text-ink-3">
            <strong className="text-navy">Featured events</strong> · count:{" "}
            {p.count}
            {p.category && (
              <>
                {" · category: "}
                <code>{p.category}</code>
              </>
            )}
            <p className="mt-1 text-[11px]">
              Live data renders only on the public page; this is an admin preview.
            </p>
          </div>
        </>
      );

    case "podcast_episode":
      return (
        <>
          <HeaderEl header={p.header} />
          {p.showLabel && (
            <span className="sh-eyebrow">{p.showLabel}</span>
          )}
          <div className="rounded-md border border-dashed border-rule bg-cream/40 p-4 text-xs text-ink-3">
            <strong className="text-navy">Podcast episode</strong>
            {p.description && <p className="mt-2 text-ink-2">{p.description}</p>}
            {p.url ? (
              <p className="mt-1 break-all font-mono text-[11px]">{p.url}</p>
            ) : (
              <p className="mt-1 text-[11px]">No URL set yet.</p>
            )}
            <p className="mt-1 text-[11px]">Player iframe renders on the public site.</p>
          </div>
        </>
      );

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
                {col.blocks.map((b: PageLeafBlock, bi) => (
                  <PreviewBlock
                    key={bi}
                    payload={b as PageSectionPayload}
                    imgUrls={imgUrls}
                    staffOptions={staffOptions}
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

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed border-rule bg-cream/40 text-xs text-ink-3">
      {label} not configured yet
    </div>
  );
}

function EmbedPreview({ embed }: { embed: EmbedPayload }) {
  const baseClass =
    "w-full overflow-hidden rounded-lg border border-rule bg-black/5 aspect-video";
  switch (embed.provider) {
    case "youtube":
      return (
        <div className={baseClass}>
          {embed.videoId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${embed.videoId}`}
              title={embed.title ?? "YouTube video"}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="size-full"
            />
          ) : (
            <Placeholder label="YouTube" />
          )}
        </div>
      );
    case "vimeo":
      return (
        <div className={baseClass}>
          {embed.videoId ? (
            <iframe
              src={`https://player.vimeo.com/video/${embed.videoId}`}
              title={embed.title ?? "Vimeo video"}
              loading="lazy"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="size-full"
            />
          ) : (
            <Placeholder label="Vimeo" />
          )}
        </div>
      );
    case "bunny":
      return (
        <div className={baseClass}>
          {embed.url ? (
            <iframe
              src={embed.url}
              title={embed.title ?? "Video"}
              loading="lazy"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="size-full"
            />
          ) : (
            <Placeholder label="Bunny" />
          )}
        </div>
      );
    default: {
      const height = embed.provider === "iframe" && embed.height ? embed.height : 700;
      return embed.url ? (
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
      ) : (
        <Placeholder label={embed.provider} />
      );
    }
  }
}
