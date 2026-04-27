import { unstable_cache } from "next/cache";
import { XMLParser } from "fast-xml-parser";

/**
 * Minimal podcast RSS shape we render from. We grab show-level metadata
 * (title, link, image) and a list of episodes, sorted newest first.
 */
export type PodcastShow = {
  title: string;
  link: string | null;
  description: string | null;
  imageUrl: string | null;
  /** Auto-detected canonical Spotify/Apple URL, when the feed advertises one. */
  spotifyUrl: string | null;
  applePodcastsUrl: string | null;
  episodes: PodcastEpisode[];
};

export type PodcastEpisode = {
  /** Stable id — `<guid>` or `<enclosure url>` fallback. */
  id: string;
  title: string;
  /** ISO date string — usable as `<time dateTime>`. */
  pubDate: string | null;
  /** Public episode page (e.g. Spotify episode link). */
  link: string | null;
  /** Direct audio URL — drives the inline `<audio>` player. */
  audioUrl: string | null;
  /** Plain-text-ish description. We strip HTML tags. */
  description: string | null;
  /** Cover art for this episode (falls back to show image). */
  imageUrl: string | null;
  /** Duration string from `<itunes:duration>` (HH:MM:SS or seconds). */
  duration: string | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: true,
});

/** 1-hour server-side cache. Tag is per-feed-URL so callers can revalidate. */
export const fetchPodcastFeed = unstable_cache(
  async (feedUrl: string): Promise<PodcastShow | null> => {
    return fetchPodcastFeedRaw(feedUrl);
  },
  ["podcast-feed"],
  { tags: ["podcast"], revalidate: 3600 },
);

export async function fetchPodcastFeedRaw(
  feedUrl: string,
): Promise<PodcastShow | null> {
  let res: Response;
  try {
    res = await fetch(feedUrl, {
      // Some hosts gate on User-Agent.
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SaintHelenBot/1.0; +https://sainthelen.org)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 3600 },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const text = await res.text();
  return parsePodcastFeed(text);
}

export function parsePodcastFeed(xml: string): PodcastShow | null {
  let root: ParsedRoot;
  try {
    root = parser.parse(xml) as ParsedRoot;
  } catch {
    return null;
  }
  const channel = root?.rss?.channel;
  if (!channel) return null;

  const showImage = pickImageUrl(channel.image, channel["itunes:image"]);
  const items = toArray(channel.item);
  const episodes: PodcastEpisode[] = items.map((it) => {
    const enclosureUrl = it.enclosure?.["@_url"] ?? null;
    const guid =
      typeof it.guid === "string"
        ? it.guid
        : (it.guid?.["#text"] ?? enclosureUrl ?? it.link ?? it.title ?? "");
    return {
      id: String(guid),
      title: stripHtml(it.title ?? ""),
      pubDate: parsePubDate(it.pubDate),
      link: it.link ?? null,
      audioUrl: enclosureUrl,
      description: stripHtml(it["itunes:summary"] ?? it.description ?? "").trim() ||
        null,
      imageUrl: pickImageUrl(undefined, it["itunes:image"]) ?? showImage,
      duration: it["itunes:duration"] ?? null,
    };
  });

  // Newest first — feeds usually arrive that way but normalize anyway.
  episodes.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const dbb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return dbb - da;
  });

  return {
    title: stripHtml(channel.title ?? "").trim() || "Podcast",
    link: channel.link ?? null,
    description: stripHtml(channel.description ?? "").trim() || null,
    imageUrl: showImage,
    spotifyUrl: detectSpotifyShow(channel),
    applePodcastsUrl: detectApplePodcasts(channel),
    episodes,
  };
}

/* ---------- helpers ----------------------------------------------- */

type ParsedItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  guid?: string | { "#text"?: string };
  enclosure?: { "@_url"?: string };
  "itunes:image"?: { "@_href"?: string };
  "itunes:summary"?: string;
  "itunes:duration"?: string;
};

type ParsedChannel = {
  title?: string;
  link?: string;
  description?: string;
  image?: { url?: string };
  "itunes:image"?: { "@_href"?: string };
  "itunes:new-feed-url"?: string;
  "itunes:link"?: string | { "@_href"?: string };
  item?: ParsedItem | ParsedItem[];
  "atom:link"?:
    | { "@_href"?: string; "@_rel"?: string }
    | { "@_href"?: string; "@_rel"?: string }[];
};

type ParsedRoot = {
  rss?: { channel?: ParsedChannel };
};

function toArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function pickImageUrl(
  rss: { url?: string } | undefined,
  itunes: { "@_href"?: string } | undefined,
): string | null {
  return rss?.url ?? itunes?.["@_href"] ?? null;
}

function parsePubDate(v: string | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function stripHtml(s: string): string {
  if (!s) return "";
  return decodeEntities(s.replace(/<\/?[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * RSS feeds frequently double-encode (e.g. `&amp;#39;`) or land HTML
 * entities inside CDATA. Decode the common named entities + every
 * numeric entity (decimal + hex) in one pass.
 */
function decodeEntities(s: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    hellip: "…",
    mdash: "—",
    ndash: "–",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”",
    copy: "©",
    reg: "®",
    trade: "™",
  };
  // Run twice to undo accidental double-encoding (`&amp;#39;` → `&#39;` → `'`).
  const decode = (raw: string) =>
    raw
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
        String.fromCodePoint(parseInt(h, 16)),
      )
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
      .replace(/&([a-zA-Z]+);/g, (m, name) => named[name] ?? m);
  return decode(decode(s));
}

function detectSpotifyShow(channel: ParsedChannel): string | null {
  const links = toArray(channel["atom:link"]);
  for (const l of links) {
    if (typeof l === "object" && l["@_href"]?.includes("spotify.com")) {
      return l["@_href"];
    }
  }
  if (channel.link?.includes("spotify.com")) return channel.link;
  return null;
}

function detectApplePodcasts(channel: ParsedChannel): string | null {
  if (typeof channel["itunes:link"] === "string") return channel["itunes:link"];
  if (
    typeof channel["itunes:link"] === "object" &&
    channel["itunes:link"]?.["@_href"]
  ) {
    return channel["itunes:link"]["@_href"]!;
  }
  if (channel.link?.includes("podcasts.apple.com")) return channel.link;
  return null;
}
