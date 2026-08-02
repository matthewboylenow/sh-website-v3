import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  STARTER_LAYOUTS,
  isStarterLayoutId,
  sectionsForStarterLayout,
} from "@/lib/page-starter-layouts";
import { MinistrySectionsManifestSchema } from "@/lib/validators/page-sections";

/**
 * A starter layout that fails validation would break page creation for
 * everyone, silently, from the moment it shipped. A starter layout that
 * throws in the renderer would 500 the page the editor was just told they
 * created. Both are cheap to prevent and expensive to discover.
 */

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt } = props;
    // eslint-disable-next-line @next/next/no-img-element -- this is the mock
    return <img src={String(src)} alt={String(alt ?? "")} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children?: React.ReactNode }) => (
    <a href={String(href)}>{children}</a>
  ),
}));

vi.mock("@/components/site/page-sections/PodcastEpisodeBlock", () => ({
  PodcastEpisodeBlock: () => <div />,
}));

const { SectionRenderer } = await import(
  "@/components/site/page-sections/SectionRenderer"
);

const emptyCtx = { images: new Map(), staff: new Map() };

describe("the catalogue", () => {
  it("offers the three layouts plus a blank option", () => {
    expect(STARTER_LAYOUTS.map((l) => l.id)).toEqual([
      "blank",
      "simple",
      "ministry",
      "event",
    ]);
  });

  it("gives every layout a label and a description", () => {
    for (const l of STARTER_LAYOUTS) {
      expect(l.label.length).toBeGreaterThan(0);
      expect(l.description.length).toBeGreaterThan(0);
    }
  });

  it("lists blocks that match what the layout actually builds", () => {
    for (const l of STARTER_LAYOUTS) {
      expect(l.blocks).toHaveLength(l.build().length);
    }
  });

  it("has no duplicate ids", () => {
    const ids = STARTER_LAYOUTS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("every layout produces valid sections", () => {
  for (const layout of STARTER_LAYOUTS) {
    it(`${layout.id} passes the section validator`, () => {
      const result = MinistrySectionsManifestSchema.safeParse({
        sections: layout.build().map((payload, i) => ({
          clientId: `seed-${i}`,
          payload,
        })),
      });
      if (!result.success) {
        throw new Error(
          `${layout.id} produced invalid sections: ${JSON.stringify(
            result.error.issues,
            null,
            2,
          )}`,
        );
      }
    });
  }
});

describe("every layout renders on an empty page", () => {
  for (const layout of STARTER_LAYOUTS) {
    it(`${layout.id} renders with no images, staff or events resolved`, () => {
      // This is the exact state a page is in one second after creation:
      // rows exist, nothing has been uploaded, nothing has been picked.
      for (const payload of layout.build()) {
        expect(() =>
          renderToStaticMarkup(
            <SectionRenderer payload={payload} ctx={emptyCtx} />,
          ),
        ).not.toThrow();
      }
    });
  }
});

describe("build() returns fresh objects each time", () => {
  it("does not share payload objects between two new pages", () => {
    const a = sectionsForStarterLayout("event");
    const b = sectionsForStarterLayout("event");
    expect(a).toEqual(b);
    expect(a[0]).not.toBe(b[0]);
  });

  it("mutating one page's seeded sections cannot affect the next", () => {
    const a = sectionsForStarterLayout("simple");
    const first = a[0];
    if (first?.kind !== "heading") throw new Error("expected a heading first");
    first.header.heading = "Edited";
    const b = sectionsForStarterLayout("simple");
    expect(b[0]).toMatchObject({ header: { heading: "Page heading" } });
  });
});

describe("sectionsForStarterLayout is safe with untrusted input", () => {
  it("returns nothing for the blank layout", () => {
    expect(sectionsForStarterLayout("blank")).toEqual([]);
  });

  it("returns nothing rather than throwing for junk", () => {
    expect(sectionsForStarterLayout("nope")).toEqual([]);
    expect(sectionsForStarterLayout(undefined)).toEqual([]);
    expect(sectionsForStarterLayout(null)).toEqual([]);
    expect(sectionsForStarterLayout(42)).toEqual([]);
    expect(sectionsForStarterLayout({ id: "event" })).toEqual([]);
  });

  it("narrows ids correctly", () => {
    expect(isStarterLayoutId("event")).toBe(true);
    expect(isStarterLayoutId("Event")).toBe(false);
    expect(isStarterLayoutId("")).toBe(false);
    expect(isStarterLayoutId(null)).toBe(false);
  });
});

describe("layout content", () => {
  it("the simple page opens with a heading and ends with a callout", () => {
    const s = sectionsForStarterLayout("simple");
    expect(s[0]?.kind).toBe("heading");
    expect(s.at(-1)?.kind).toBe("callout_banner");
  });

  it("the ministry landing leads with image + text and offers a way in", () => {
    const kinds = sectionsForStarterLayout("ministry").map((s) => s.kind);
    expect(kinds[0]).toBe("image_text");
    expect(kinds).toContain("featured_events");
    expect(kinds).toContain("button_group");
  });

  it("the event layout leads with the registration callout", () => {
    const s = sectionsForStarterLayout("event");
    expect(s[0]).toMatchObject({ kind: "callout_banner", tag: "Upcoming" });
    expect(s.map((b) => b.kind)).toContain("card_grid");
  });

  it("every placeholder link is either a real internal path or a bare #", () => {
    // No empty hrefs, and nothing pointing off-site by accident.
    for (const layout of STARTER_LAYOUTS) {
      for (const block of layout.build()) {
        const hrefs: string[] = [];
        if (block.kind === "link_list" || block.kind === "button_group") {
          hrefs.push(...block.items.map((i) => i.href));
        }
        if (block.kind === "callout_banner" && block.ctaHref) {
          hrefs.push(block.ctaHref);
        }
        for (const href of hrefs) {
          expect(href.length).toBeGreaterThan(0);
          expect(href === "#" || href.startsWith("/")).toBe(true);
        }
      }
    }
  });

  it("never seeds a real blob key it cannot guarantee exists", () => {
    for (const layout of STARTER_LAYOUTS) {
      for (const block of layout.build()) {
        if (block.kind === "image_text" || block.kind === "image") {
          expect(block.blobKey).toBe("");
        }
      }
    }
  });
});
