import { fetchPodcastFeed, type PodcastEpisode } from "@/lib/podcast";
import type { SectionHeader } from "@/db/schema";

type Props = {
  feedUrl: string;
  episodeGuid?: string;
  showLabel?: string;
  description?: string;
  subscribeLabel?: string;
  subscribeHref?: string;
  header?: SectionHeader;
};

/**
 * Renders the latest (or pinned) episode from a podcast RSS feed.
 *
 * Auto-falls-back to a graceful empty state when the feed can't be
 * fetched or has no episodes — never crashes the page.
 */
export async function PodcastEpisodeBlock({
  feedUrl,
  episodeGuid,
  showLabel,
  description,
  subscribeLabel,
  subscribeHref,
  header,
}: Props) {
  const show = await fetchPodcastFeed(feedUrl);
  if (!show || show.episodes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-rule bg-cream/40 p-6 text-sm text-ink-3">
        Podcast feed didn&rsquo;t return any episodes (yet). Check the feed URL
        in admin, or come back once the show ships its first episode.
      </div>
    );
  }

  const episode: PodcastEpisode =
    (episodeGuid ? show.episodes.find((e) => e.id === episodeGuid) : null) ??
    show.episodes[0]!;

  const eyebrow = showLabel ?? show.title;
  const intro = description ?? episode.description;
  const fallbackSubscribe = show.spotifyUrl ?? show.applePodcastsUrl ?? show.link;
  const subHref = subscribeHref || fallbackSubscribe;
  const subLabel = subscribeLabel || (fallbackSubscribe ? "Subscribe to the show" : null);
  const isExternal = !!subHref && /^https?:\/\//.test(subHref);

  return (
    <div className="rounded-2xl border border-rule bg-cream/40 p-6 md:p-8">
      {(header?.eyebrow || eyebrow) && (
        <span
          className={
            "mb-1 block font-sans text-xs font-semibold uppercase tracking-[0.14em] text-rust [.sh-on-dark_&]:text-gold " +
            (header?.align === "center" ? "text-center" : "")
          }
        >
          {header?.eyebrow ?? eyebrow}
        </span>
      )}
      {header?.heading ? (
        <header
          className={
            "mb-6 max-w-[60ch] " +
            (header.align === "center" ? "mx-auto text-center" : "")
          }
        >
          <h2 className="font-serif font-bold leading-tight text-navy text-[clamp(28px,3.2vw,40px)] [.sh-on-dark_&]:text-white">
            {header.heading}
          </h2>
          <span
            className="mt-3 inline-block h-[3px] w-14 rounded-sm bg-rust [.sh-on-dark_&]:bg-gold"
            aria-hidden="true"
          />
          {header.subheading && (
            <p className="mt-3 text-[17px] leading-snug text-ink-2 [.sh-on-dark_&]:text-white/80">
              {header.subheading}
            </p>
          )}
        </header>
      ) : (
        <h3 className="mt-2 font-serif text-xl font-bold text-navy">
          {episode.title}
        </h3>
      )}

      <div className="grid gap-5 md:grid-cols-[160px_1fr] md:items-start">
        {episode.imageUrl && (
          <div className="overflow-hidden rounded-lg border border-rule">
            {/* Episode/show art is from the feed's host — render via plain img
                to skip Next image-domain whitelisting. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={episode.imageUrl}
              alt={`${show.title} cover art`}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div>
          {header?.heading && (
            <h3 className="font-serif text-lg font-bold text-navy">
              {episode.title}
            </h3>
          )}
          <div className="flex flex-wrap items-center gap-x-3 text-xs text-ink-3">
            {episode.pubDate && (
              <time dateTime={episode.pubDate}>
                {new Date(episode.pubDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            )}
            {episode.duration && <span>· {episode.duration}</span>}
          </div>
          {intro && (
            <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
              {intro.length > 320 ? intro.slice(0, 320) + "…" : intro}
            </p>
          )}
          {episode.audioUrl && (
            <audio
              controls
              preload="none"
              src={episode.audioUrl}
              className="mt-4 w-full"
            >
              Your browser doesn&rsquo;t support inline audio.{" "}
              <a href={episode.audioUrl}>Download the episode</a>.
            </audio>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {episode.link && (
              <a
                href={episode.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-rust-dark hover:text-rust"
              >
                Listen on the show page
                <span aria-hidden="true">→</span>
              </a>
            )}
            {subLabel && subHref && (
              <a
                href={subHref}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-2 rounded-pill border border-rule bg-white px-5 py-2 text-sm font-semibold text-navy transition-colors hover:border-navy"
              >
                {subLabel} <span aria-hidden="true">→</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

