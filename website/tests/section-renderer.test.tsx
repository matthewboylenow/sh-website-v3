import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PageSectionPayload } from "@/db/schema";
import {
  BLOB_KEY,
  BLOB_URL,
  MINISTRY_ID,
  PAGE_SECTION_KINDS,
  STAFF_ID,
  sectionFixtures,
} from "./fixtures/sections";

/**
 * Every block kind, rendered. Not a pixel test — a "does this throw, and
 * does it produce anything at all" test.
 *
 * The failure this guards against is specific and nasty: a block whose
 * payload is missing a field the renderer dereferences takes down the
 * whole page, because a thrown error in a server component is not a
 * missing block, it is a 500. On a parish site that is the homepage
 * going dark on a Sunday morning.
 */

// next/image needs a Next request context; a plain <img> is enough here.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    void rest;
    // eslint-disable-next-line @next/next/no-img-element -- this is the mock
    return <img src={String(src)} alt={String(alt ?? "")} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children?: React.ReactNode;
  }) => <a href={String(href)}>{children}</a>,
}));

// Async server component that fetches an RSS feed. Out of scope for a
// no-network suite; its own behaviour is not what we are guarding here.
vi.mock("@/components/site/page-sections/PodcastEpisodeBlock", () => ({
  PodcastEpisodeBlock: ({ showLabel }: { showLabel?: string }) => (
    <div data-podcast>{showLabel ?? "Podcast"}</div>
  ),
}));

const { SectionRenderer } = await import(
  "@/components/site/page-sections/SectionRenderer"
);
type Ctx = Parameters<typeof SectionRenderer>[0]["ctx"];

const baseCtx: Ctx = {
  images: new Map([[BLOB_KEY, BLOB_URL]]),
  staff: new Map([
    [
      STAFF_ID,
      {
        slug: "msgr-tom",
        name: "Msgr. Tom",
        role: "Pastor",
        email: "pastor@sainthelen.org",
        photoBlobKey: BLOB_KEY,
        bio: null,
      },
    ],
  ]),
};

const ministryRow = {
  id: MINISTRY_ID,
  slug: "lectors",
  name: "Lectors",
  summary: "Proclaim the readings.",
  photoBlobKey: BLOB_KEY,
} as never;

const eventRow = {
  id: "0b6d1b2e-9a11-4d3c-8f77-1a2b3c4d5e6f",
  slug: "parish-picnic",
  title: "Parish Picnic",
  summary: "Food on the lawn.",
  photoBlobKey: BLOB_KEY,
  startsAt: new Date("2026-08-15T20:00:00.000Z"),
  endsAt: new Date("2026-08-15T23:00:00.000Z"),
  occurrenceStartsAt: new Date("2026-08-15T20:00:00.000Z"),
  occurrenceEndsAt: new Date("2026-08-15T23:00:00.000Z"),
} as never;

const fullCtx: Ctx = {
  ...baseCtx,
  featuredMinistries: {
    spotlight: [ministryRow],
    byId: new Map([[MINISTRY_ID, ministryRow]]),
  },
  featuredEvents: { instances: [eventRow] },
};

const render = (payload: PageSectionPayload, ctx: Ctx = fullCtx) =>
  renderToStaticMarkup(<SectionRenderer payload={payload} ctx={ctx} />);

describe("every block kind renders without throwing", () => {
  for (const kind of PAGE_SECTION_KINDS) {
    it(`renders ${kind}`, () => {
      const html = render(sectionFixtures[kind]);
      expect(html).toContain("<section");
      // featured_* legitimately render nothing when their ctx slice is
      // absent, but with fullCtx everything should produce real content.
      expect(html.length).toBeGreaterThan("<section></section>".length);
    });
  }
});

describe("content actually reaches the markup", () => {
  it("renders heading text", () => {
    expect(render(sectionFixtures.heading)).toContain("Baptism at Saint Helen");
  });

  it("puts the anchor id on the section so in-page links work", () => {
    expect(render(sectionFixtures.heading)).toContain('id="baptism"');
  });

  it("renders rich text html rather than escaping it", () => {
    const html = render(sectionFixtures.rich_text);
    expect(html).toContain("second Sunday of the month");
    expect(html).not.toContain("&lt;p&gt;");
  });

  it("resolves a blob key to its CDN url", () => {
    expect(render(sectionFixtures.image)).toContain(BLOB_URL);
  });

  it("renders every link in a link list", () => {
    const html = render(sectionFixtures.link_list);
    expect(html).toContain("Baptism preparation packet");
    expect(html).toContain("Register for a date");
  });

  it("renders both columns of a columns block", () => {
    const html = render(sectionFixtures.columns);
    expect(html).toContain("Left column copy");
    expect(html).toContain("Bulletin");
  });

  it("renders the staff member from context", () => {
    const html = render(sectionFixtures.staff_card);
    expect(html).toContain("Msgr. Tom");
    expect(html).toContain("pastor@sainthelen.org");
  });

  it("honours hideContact on a staff card", () => {
    const html = render({ ...sectionFixtures.staff_card, hideContact: true });
    expect(html).toContain("Msgr. Tom");
    expect(html).not.toContain("pastor@sainthelen.org");
  });

  it("renders a featured event from context", () => {
    expect(render(sectionFixtures.featured_events)).toContain("Parish Picnic");
  });

  it("renders a featured ministry from context", () => {
    expect(render(sectionFixtures.featured_ministries)).toContain("Lectors");
  });
});

describe("embeds go to the right place", () => {
  const embed = (e: unknown) =>
    render({ kind: "embed", embed: e } as PageSectionPayload);

  it("uses the cookieless YouTube host", () => {
    expect(embed({ provider: "youtube", videoId: "abc123" })).toContain(
      "https://www.youtube-nocookie.com/embed/abc123",
    );
  });

  it("uses the Vimeo player host", () => {
    expect(embed({ provider: "vimeo", videoId: "999" })).toContain(
      "https://player.vimeo.com/video/999",
    );
  });

  it("sandboxes a generic iframe", () => {
    const html = embed({ provider: "iframe", url: "https://example.org/x" });
    expect(html).toContain("sandbox=");
    expect(html).toContain("strict-origin-when-cross-origin");
  });

  it("applies a custom iframe height", () => {
    expect(
      embed({ provider: "iframe", url: "https://example.org/x", height: 420 }),
    ).toContain("420px");
  });

  it("defaults a form embed to 700px", () => {
    expect(
      embed({ provider: "google_form", url: "https://docs.google.com/forms/x" }),
    ).toContain("700px");
  });
});

describe("missing data degrades instead of exploding", () => {
  const emptyCtx: Ctx = { images: new Map(), staff: new Map() };

  it("hides an image block whose blob never resolved", () => {
    const html = render(sectionFixtures.image, emptyCtx);
    expect(html).not.toContain(BLOB_URL);
    expect(() => render(sectionFixtures.image, emptyCtx)).not.toThrow();
  });

  it("still renders the text half of an image_text with no image", () => {
    const html = render(sectionFixtures.image_text, emptyCtx);
    expect(html).toContain("eats together on the lawn");
  });

  it("skips unresolved gallery images without dropping the block", () => {
    expect(() => render(sectionFixtures.image_gallery, emptyCtx)).not.toThrow();
  });

  it("renders nothing for a staff card pointing at a deleted person", () => {
    const html = render(sectionFixtures.staff_card, emptyCtx);
    expect(html).not.toContain("Msgr. Tom");
  });

  it("renders nothing for featured blocks when their context is absent", () => {
    expect(() => render(sectionFixtures.featured_events, emptyCtx)).not.toThrow();
    expect(() =>
      render(sectionFixtures.featured_ministries, emptyCtx),
    ).not.toThrow();
  });

  it("survives an empty gallery", () => {
    expect(() =>
      render({ kind: "image_gallery", images: [] } as PageSectionPayload),
    ).not.toThrow();
  });

  it("survives a manual featured_ministries pointing at nothing", () => {
    expect(() =>
      render({
        kind: "featured_ministries",
        mode: "manual",
        count: 3,
        ministryIds: ["11111111-1111-4111-8111-111111111111"],
      } as PageSectionPayload),
    ).not.toThrow();
  });

  it("survives a callout with no CTA", () => {
    expect(() =>
      render({ kind: "callout_banner", title: "Just a title" } as PageSectionPayload),
    ).not.toThrow();
  });

  it("survives pastor_welcome with no photo and no video", () => {
    const html = render(
      { kind: "pastor_welcome", html: "<p>Hello.</p>" } as PageSectionPayload,
      emptyCtx,
    );
    expect(html).toContain("Hello.");
  });

  it("survives a columns block with one empty column", () => {
    expect(() =>
      render({
        kind: "columns",
        columns: [{ blocks: [] }, { blocks: [] }],
      } as PageSectionPayload),
    ).not.toThrow();
  });
});

describe("external links carry rel=noopener", () => {
  it("marks an off-site button as external", () => {
    const html = render({
      kind: "button_group",
      items: [{ label: "Give", href: "https://sainthelen.tpsdb.com/give" }],
    } as PageSectionPayload);
    expect(html).toContain("noopener");
    expect(html).toContain('target="_blank"');
  });

  it("leaves an internal link alone", () => {
    const html = render({
      kind: "button_group",
      items: [{ label: "Contact", href: "/contact" }],
    } as PageSectionPayload);
    expect(html).not.toContain('target="_blank"');
  });
});
