import type { PageSectionPayload } from "@/db/schema";

/**
 * Starter layouts for "+ New page".
 *
 * These are data, not architecture. Picking one seeds a handful of ordinary
 * `page_sections` rows and then gets out of the way — there is no template
 * entity, no link back to the layout, nothing to keep in sync. Once the
 * rows exist they are indistinguishable from blocks added by hand, and the
 * section editor treats them exactly the same.
 *
 * That is the whole point. The gap this closes is "make me a page that does
 * XYZ" meaning fifteen minutes of assembling blocks from an empty screen.
 * It is not a template system, and it should not grow into one.
 *
 * The placeholder copy is written to be replaced. It says what belongs in
 * each block rather than pretending to be real content, so a half-finished
 * page reads as obviously unfinished instead of quietly wrong.
 */

export type StarterLayoutId = "blank" | "simple" | "ministry" | "event";

export type StarterLayout = {
  id: StarterLayoutId;
  label: string;
  /** One line, shown under the label in the picker. */
  description: string;
  /** Plain-language list of what gets added, so nobody is surprised. */
  blocks: string[];
  build: () => PageSectionPayload[];
};

const PLACEHOLDER_IMAGE = "";

export const STARTER_LAYOUTS: StarterLayout[] = [
  {
    id: "blank",
    label: "Blank page",
    description: "Start with nothing and add blocks yourself.",
    blocks: [],
    build: () => [],
  },

  {
    id: "simple",
    label: "Simple text page",
    description:
      "A heading, a few paragraphs, and one callout. The everyday one-pager.",
    blocks: ["Heading", "Rich text", "Callout banner"],
    build: () => [
      {
        kind: "heading",
        header: { heading: "Page heading", align: "left" },
        level: 2,
      },
      {
        kind: "rich_text",
        html:
          "<p>Replace this with the main body of the page. Two or three " +
          "short paragraphs read better than one long one.</p>",
      },
      {
        kind: "callout_banner",
        title: "Questions?",
        body: "Call the Parish Office at 908-232-1214 and we will point you to the right person.",
        ctaLabel: "Contact us",
        ctaHref: "/contact",
        tone: "navy",
      },
    ],
  },

  {
    id: "ministry",
    label: "Ministry landing",
    description:
      "Photo and intro, what the ministry does, its upcoming events, and how to join.",
    blocks: [
      "Image + text intro",
      "Rich text",
      "Featured events",
      "Button group",
    ],
    build: () => [
      {
        kind: "image_text",
        blobKey: PLACEHOLDER_IMAGE,
        alt: "",
        imageSide: "left",
        html:
          "<p>Open with who this ministry is for and what happens when " +
          "someone shows up. Two or three sentences.</p>",
      },
      {
        kind: "rich_text",
        header: { heading: "What we do" },
        html:
          "<p>When and where the ministry meets, what a typical gathering " +
          "looks like, and anything a newcomer would want to know before " +
          "walking in.</p>",
      },
      {
        // Deliberately unfiltered. `autoScopeToParent` only resolves when
        // the parent is a ministry row, and a CMS page is not one — it
        // would silently do nothing here. Set a category in the editor to
        // narrow this down.
        kind: "featured_events",
        header: {
          heading: "Coming up",
          subheading: "Set a category in the editor to narrow this to this ministry's events.",
        },
        count: 3,
      },
      {
        kind: "button_group",
        header: { heading: "Get involved" },
        items: [
          { label: "Ask a question", href: "/contact", variant: "primary" },
          { label: "See all ministries", href: "/ministries", variant: "secondary" },
        ],
      },
    ],
  },

  {
    id: "event",
    label: "Upcoming event",
    description:
      "For a pilgrimage, retreat, or a series — dates and details, what to expect, and how to register.",
    blocks: [
      "Callout banner with registration CTA",
      "Rich text overview",
      "Card grid for dates or sessions",
      "Link list for documents",
      "Button group",
    ],
    build: () => [
      {
        kind: "callout_banner",
        tag: "Upcoming",
        title: "Event name",
        body: "One line on when it is and who it is for. Registration closes on a date.",
        ctaLabel: "Register",
        ctaHref: "/contact",
        tone: "navy",
      },
      {
        kind: "rich_text",
        header: { heading: "About this event" },
        html:
          "<p>What it is, why the parish is hosting it, and what someone " +
          "walks away with. If a speaker or a religious order is involved, " +
          "say who.</p>",
      },
      {
        kind: "card_grid",
        header: {
          heading: "Dates and sessions",
          subheading: "Delete this block if it is a single-date event.",
        },
        cards: [
          { title: "Session one", summary: "Date, time, and location." },
          { title: "Session two", summary: "Date, time, and location." },
          { title: "Session three", summary: "Date, time, and location." },
        ],
        layout: "uniform",
        columns: 3,
      },
      {
        // Placeholder hrefs are "#" rather than "" because the validator
        // requires a non-empty href. Pages are created as drafts, so these
        // never reach the public site before someone fills them in.
        kind: "link_list",
        header: {
          heading: "Details and forms",
          subheading: "Replace the # links with the real files, or delete this block.",
        },
        items: [
          { label: "Flyer (PDF)", href: "#", iconHint: "pdf" },
          { label: "Registration form", href: "#", iconHint: "form" },
        ],
      },
      {
        kind: "button_group",
        items: [
          { label: "Register", href: "#", variant: "primary" },
          { label: "Questions? Contact the office", href: "/contact", variant: "secondary" },
        ],
      },
    ],
  },
];

const BY_ID = new Map(STARTER_LAYOUTS.map((l) => [l.id, l]));

/** Narrow an untrusted form value to a known layout id. */
export function isStarterLayoutId(value: unknown): value is StarterLayoutId {
  return typeof value === "string" && BY_ID.has(value as StarterLayoutId);
}

/**
 * Sections for a layout id. Anything unrecognised — a stale form, a hand-
 * crafted POST — yields an empty page rather than an error, because failing
 * to create a page is worse than creating an empty one.
 */
export function sectionsForStarterLayout(
  id: unknown,
): PageSectionPayload[] {
  if (!isStarterLayoutId(id)) return [];
  return BY_ID.get(id)!.build();
}
