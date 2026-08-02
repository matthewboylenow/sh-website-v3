import type { PageSectionPayload } from "@/db/schema";

/**
 * One valid payload per block kind, written the way the admin editor
 * actually produces them. Shared by the validator suite and the render
 * suite so the two can never disagree about what "valid" means.
 *
 * If you add a block kind, add it here. `PAGE_SECTION_KINDS` below is
 * exhaustive-checked against the union, so the compiler will tell you.
 */

export const STAFF_ID = "3f9a1c22-7b41-4b8e-9c0d-2ab7e6f10001";
export const MINISTRY_ID = "8c11d044-2e55-4f61-b0aa-91ce77b20002";
export const BLOB_KEY = "media/2026/parish-picnic.jpg";
export const BLOB_URL = "https://cdn.sainthelen.org/media/2026/parish-picnic.jpg";

export const sectionFixtures = {
  heading: {
    kind: "heading",
    header: { heading: "Baptism at Saint Helen", anchorId: "baptism" },
    level: 2,
  },
  rich_text: {
    kind: "rich_text",
    html: "<p>Baptisms are celebrated on the second Sunday of the month.</p>",
  },
  image: {
    kind: "image",
    blobKey: BLOB_KEY,
    alt: "Parishioners at the parish picnic",
    caption: "Parish picnic, 2026",
  },
  image_text: {
    kind: "image_text",
    blobKey: BLOB_KEY,
    alt: "Parish picnic",
    html: "<p>Every August the whole parish eats together on the lawn.</p>",
    imageSide: "left",
  },
  image_gallery: {
    kind: "image_gallery",
    images: [
      { blobKey: BLOB_KEY, alt: "One" },
      { blobKey: BLOB_KEY, alt: "Two", caption: "Second shot" },
    ],
    columns: 2,
  },
  link_list: {
    kind: "link_list",
    items: [
      { label: "Baptism preparation packet", href: "/docs/baptism.pdf", iconHint: "pdf" },
      { label: "Register for a date", href: "https://forms.gle/abc", iconHint: "form" },
    ],
  },
  button_group: {
    kind: "button_group",
    items: [
      { label: "Request a baptism", href: "/contact", variant: "primary" },
      { label: "Read the guide", href: "/baptism-guide", variant: "secondary" },
    ],
  },
  video: {
    kind: "video",
    url: "https://cdn.sainthelen.org/video/welcome.mp4",
    type: "mp4",
    caption: "A word from Msgr. Tom",
  },
  card_grid: {
    kind: "card_grid",
    header: { heading: "Ways to get involved" },
    cards: [
      { title: "Lector", summary: "Proclaim the readings at Mass.", href: "/ministries/lectors" },
      { title: "Ushers", summary: "Welcome people at the door.", href: "/ministries/ushers" },
    ],
    layout: "uniform",
    columns: 2,
  },
  embed: {
    kind: "embed",
    embed: { provider: "youtube", videoId: "dQw4w9WgXcQ", title: "Parish tour" },
  },
  staff_card: {
    kind: "staff_card",
    staffId: STAFF_ID,
  },
  callout_banner: {
    kind: "callout_banner",
    tag: "New",
    title: "Registration is open",
    body: "Space is limited to forty families.",
    ctaLabel: "Register",
    ctaHref: "/register",
    tone: "navy",
  },
  featured_ministries: {
    kind: "featured_ministries",
    mode: "spotlight",
    count: 3,
  },
  featured_events: {
    kind: "featured_events",
    count: 3,
  },
  podcast_episode: {
    kind: "podcast_episode",
    feedUrl: "https://anchor.fm/s/abc123/podcast/rss",
    showLabel: "Saint Helen Podcast",
  },
  pastor_welcome: {
    kind: "pastor_welcome",
    html: "<p>Welcome. However you found us, we are glad you are here.</p>",
    signatureName: "Msgr. Tom",
    signatureRole: "Pastor",
    mediaSide: "right",
  },
  columns: {
    kind: "columns",
    ratio: "60-40",
    columns: [
      {
        blocks: [
          { kind: "rich_text", html: "<p>Left column copy.</p>" },
        ],
      },
      {
        blocks: [
          {
            kind: "link_list",
            items: [{ label: "Bulletin", href: "/bulletin" }],
          },
        ],
      },
    ],
  },
} as const satisfies Record<string, PageSectionPayload>;

/** Every kind in the union, as a runtime list. */
export const PAGE_SECTION_KINDS = Object.keys(
  sectionFixtures,
) as (keyof typeof sectionFixtures)[];

/**
 * Compile-time exhaustiveness: if a kind is added to PageSectionPayload
 * and not to `sectionFixtures`, this assignment stops type-checking.
 */
const _exhaustive: Record<PageSectionPayload["kind"], PageSectionPayload> =
  sectionFixtures;
void _exhaustive;
