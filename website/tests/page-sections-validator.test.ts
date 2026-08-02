import { describe, expect, it } from "vitest";
import {
  MinistrySectionsManifestSchema,
  PageSectionPayloadSchema,
} from "@/lib/validators/page-sections";
import {
  BLOB_KEY,
  MINISTRY_ID,
  PAGE_SECTION_KINDS,
  STAFF_ID,
  sectionFixtures,
} from "./fixtures/sections";

/**
 * The section validator is the gate between the admin editor and a jsonb
 * column that the public renderer trusts completely. Anything that gets
 * past this schema gets rendered.
 */

const parse = (p: unknown) => PageSectionPayloadSchema.safeParse(p);

describe("every block kind round-trips", () => {
  it("covers every kind in the union", () => {
    // 16 leaf blocks plus the columns wrapper. STATUS.md and the handoff
    // notes both say "18 block kinds"; the union has 17. The fixtures file
    // is exhaustive-checked against the type, so this number is the real
    // one — if it changes, a block kind was added or removed.
    expect(PAGE_SECTION_KINDS).toHaveLength(17);
  });

  for (const kind of PAGE_SECTION_KINDS) {
    it(`accepts a valid ${kind} payload`, () => {
      const result = parse(sectionFixtures[kind]);
      if (!result.success) {
        throw new Error(
          `${kind} rejected: ${JSON.stringify(result.error.issues, null, 2)}`,
        );
      }
      expect(result.data.kind).toBe(kind);
    });
  }
});

describe("rejects malformed payloads", () => {
  it("rejects an unknown kind", () => {
    expect(parse({ kind: "carousel", images: [] }).success).toBe(false);
  });

  it("rejects a missing kind", () => {
    expect(parse({ html: "<p>orphan</p>" }).success).toBe(false);
  });

  it("rejects a null payload", () => {
    expect(parse(null).success).toBe(false);
  });

  it("rejects a heading with no header at all", () => {
    // heading is the one kind where header is required, because the
    // heading *is* the header.
    expect(parse({ kind: "heading" }).success).toBe(false);
  });

  it("rejects a rich_text with no html", () => {
    expect(parse({ kind: "rich_text" }).success).toBe(false);
  });

  it("rejects a callout_banner with an empty title", () => {
    expect(parse({ kind: "callout_banner", title: "" }).success).toBe(false);
  });

  it("rejects a staff_card whose staffId is not a uuid", () => {
    expect(parse({ kind: "staff_card", staffId: "matthew" }).success).toBe(false);
  });

  it("rejects a video with a non-URL source", () => {
    expect(
      parse({ kind: "video", url: "welcome.mp4", type: "mp4" }).success,
    ).toBe(false);
  });

  it("rejects a video with an unknown player type", () => {
    expect(
      parse({
        kind: "video",
        url: "https://cdn.sainthelen.org/v.mp4",
        type: "quicktime",
      }).success,
    ).toBe(false);
  });
});

describe("anchor ids", () => {
  const withAnchor = (anchorId: string) =>
    parse({ kind: "heading", header: { heading: "H", anchorId } });

  it("accepts lowercase, digits and hyphens", () => {
    expect(withAnchor("mass-times-2026").success).toBe(true);
  });

  it("accepts an empty anchor", () => {
    expect(withAnchor("").success).toBe(true);
  });

  it("rejects uppercase, spaces and punctuation", () => {
    expect(withAnchor("MassTimes").success).toBe(false);
    expect(withAnchor("mass times").success).toBe(false);
    expect(withAnchor("mass_times").success).toBe(false);
    expect(withAnchor("mass#times").success).toBe(false);
  });

  it("rejects an anchor over 60 characters", () => {
    expect(withAnchor("a".repeat(61)).success).toBe(false);
    expect(withAnchor("a".repeat(60)).success).toBe(true);
  });
});

describe("length and array caps", () => {
  it("caps rich_text html at 40,000 characters", () => {
    expect(parse({ kind: "rich_text", html: "x".repeat(40000) }).success).toBe(true);
    expect(parse({ kind: "rich_text", html: "x".repeat(40001) }).success).toBe(false);
  });

  it("caps a gallery at 20 images", () => {
    const images = (n: number) =>
      Array.from({ length: n }, () => ({ blobKey: BLOB_KEY }));
    expect(parse({ kind: "image_gallery", images: images(20) }).success).toBe(true);
    expect(parse({ kind: "image_gallery", images: images(21) }).success).toBe(false);
  });

  it("requires at least one link and caps at 40", () => {
    const items = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ label: `L${i}`, href: "/x" }));
    expect(parse({ kind: "link_list", items: [] }).success).toBe(false);
    expect(parse({ kind: "link_list", items: items(40) }).success).toBe(true);
    expect(parse({ kind: "link_list", items: items(41) }).success).toBe(false);
  });

  it("caps a button group at 8", () => {
    const items = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ label: `B${i}`, href: "/x" }));
    expect(parse({ kind: "button_group", items: items(8) }).success).toBe(true);
    expect(parse({ kind: "button_group", items: items(9) }).success).toBe(false);
  });

  it("caps a card grid at 12 cards", () => {
    const cards = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ title: `C${i}` }));
    expect(parse({ kind: "card_grid", cards: cards(12) }).success).toBe(true);
    expect(parse({ kind: "card_grid", cards: cards(13) }).success).toBe(false);
    expect(parse({ kind: "card_grid", cards: [] }).success).toBe(false);
  });
});

describe("counts are coerced and clamped", () => {
  it("accepts a numeric string from a form field", () => {
    const r = parse({ kind: "featured_events", count: "4" });
    expect(r.success).toBe(true);
    if (r.success && r.data.kind === "featured_events") {
      expect(r.data.count).toBe(4);
    }
  });

  it("clamps featured_events between 1 and 12", () => {
    expect(parse({ kind: "featured_events", count: 0 }).success).toBe(false);
    expect(parse({ kind: "featured_events", count: 13 }).success).toBe(false);
    expect(parse({ kind: "featured_events", count: 12 }).success).toBe(true);
  });

  it("clamps featured_ministries between 1 and 8", () => {
    const m = (count: unknown) =>
      parse({ kind: "featured_ministries", mode: "spotlight", count });
    expect(m(0).success).toBe(false);
    expect(m(9).success).toBe(false);
    expect(m(8).success).toBe(true);
  });

  it("rejects a fractional count", () => {
    expect(parse({ kind: "featured_events", count: 2.5 }).success).toBe(false);
  });

  it("accepts up to 20 manual ministry ids", () => {
    const ids = (n: number) => Array.from({ length: n }, () => MINISTRY_ID);
    const m = (n: number) =>
      parse({
        kind: "featured_ministries",
        mode: "manual",
        count: 3,
        ministryIds: ids(n),
      });
    expect(m(20).success).toBe(true);
    expect(m(21).success).toBe(false);
  });
});

describe("the embed allowlist", () => {
  const embed = (e: unknown) => parse({ kind: "embed", embed: e });

  it("accepts every allowed provider", () => {
    expect(embed({ provider: "youtube", videoId: "abc" }).success).toBe(true);
    expect(embed({ provider: "vimeo", videoId: "123" }).success).toBe(true);
    for (const provider of [
      "bunny",
      "spotify",
      "apple_podcasts",
      "google_form",
      "eventbrite",
      "signupgenius",
      "touchpoint",
      "iframe",
    ]) {
      expect(
        embed({ provider, url: "https://example.org/x" }).success,
        `${provider} should be allowed`,
      ).toBe(true);
    }
  });

  it("rejects a provider that is not on the list", () => {
    expect(embed({ provider: "tiktok", url: "https://tiktok.com/x" }).success).toBe(false);
    expect(embed({ provider: "facebook", url: "https://fb.com/x" }).success).toBe(false);
  });

  it("rejects a string that is not a URL at all", () => {
    expect(embed({ provider: "spotify", url: "just some text" }).success).toBe(false);
    expect(embed({ provider: "spotify", url: "//cdn.example.org/x" }).success).toBe(false);
  });

  it("PINNED: the provider name does not constrain the host", () => {
    // Worth being blunt about, because the handoff notes call this an
    // allowlist and it is not one. `provider` selects the wrapper markup
    // and the iframe height; the URL itself is unconstrained beyond being
    // parseable. A "google_form" embed can point anywhere.
    expect(
      embed({ provider: "google_form", url: "https://not-google.example/x" })
        .success,
    ).toBe(true);
    expect(
      embed({ provider: "spotify", url: "https://not-spotify.example/x" })
        .success,
    ).toBe(true);
  });

  it("PINNED: any parseable scheme passes, including javascript: and data:", () => {
    // zod's .url() delegates to the URL constructor, which is scheme
    // agnostic. These land in an iframe src. Admin-only input, so this is
    // hardening rather than an open hole, but it should be a host+scheme
    // check rather than a bare URL parse.
    expect(embed({ provider: "spotify", url: "spotify:show:123" }).success).toBe(true);
    expect(embed({ provider: "iframe", url: "javascript:alert(1)" }).success).toBe(true);
    expect(embed({ provider: "iframe", url: "data:text/html,<h1>x" }).success).toBe(true);
  });

  it("requires a videoId for youtube and vimeo", () => {
    expect(embed({ provider: "youtube", url: "https://youtu.be/x" }).success).toBe(false);
  });

  it("clamps a custom iframe height", () => {
    const h = (height: unknown) =>
      embed({ provider: "iframe", url: "https://example.org/x", height });
    expect(h(119).success).toBe(false);
    expect(h(120).success).toBe(true);
    expect(h(2000).success).toBe(true);
    expect(h(2001).success).toBe(false);
    expect(h("600").success).toBe(true);
  });
});

describe("card icons", () => {
  const withIcon = (iconName: unknown) =>
    parse({ kind: "card_grid", cards: [{ title: "C", iconName }] });

  it("rejects an icon that is not in the catalog", () => {
    expect(withIcon("definitely-not-an-icon").success).toBe(false);
  });

  it("allows no icon", () => {
    expect(withIcon(undefined).success).toBe(true);
    expect(withIcon(null).success).toBe(true);
    expect(withIcon("").success).toBe(true);
  });
});

describe("columns nesting", () => {
  const col = (blocks: unknown[]) => ({ blocks });

  it("accepts two columns of leaf blocks", () => {
    expect(parse(sectionFixtures.columns).success).toBe(true);
  });

  it("accepts three columns", () => {
    const three = {
      kind: "columns",
      columns: [
        col([{ kind: "rich_text", html: "<p>a</p>" }]),
        col([{ kind: "rich_text", html: "<p>b</p>" }]),
        col([{ kind: "rich_text", html: "<p>c</p>" }]),
      ],
    };
    expect(parse(three).success).toBe(true);
  });

  it("rejects one column and rejects four", () => {
    const build = (n: number) => ({
      kind: "columns",
      columns: Array.from({ length: n }, () =>
        col([{ kind: "rich_text", html: "<p>x</p>" }]),
      ),
    });
    expect(parse(build(1)).success).toBe(false);
    expect(parse(build(4)).success).toBe(false);
  });

  it("refuses columns inside columns — one nesting level only", () => {
    const nested = {
      kind: "columns",
      columns: [
        col([sectionFixtures.columns]),
        col([{ kind: "rich_text", html: "<p>x</p>" }]),
      ],
    };
    expect(parse(nested).success).toBe(false);
  });

  it("caps a single column at 20 blocks", () => {
    const blocks = (n: number) =>
      Array.from({ length: n }, () => ({ kind: "rich_text", html: "<p>x</p>" }));
    const build = (n: number) => ({
      kind: "columns",
      columns: [col(blocks(n)), col(blocks(1))],
    });
    expect(parse(build(20)).success).toBe(true);
    expect(parse(build(21)).success).toBe(false);
  });

  it("rejects a malformed block inside a column", () => {
    const bad = {
      kind: "columns",
      columns: [
        col([{ kind: "staff_card", staffId: "not-a-uuid" }]),
        col([{ kind: "rich_text", html: "<p>x</p>" }]),
      ],
    };
    expect(parse(bad).success).toBe(false);
  });
});

describe("the sections manifest", () => {
  const section = (payload: unknown, clientId = "abc") => ({ clientId, payload });

  it("accepts an empty page", () => {
    expect(MinistrySectionsManifestSchema.safeParse({ sections: [] }).success).toBe(true);
  });

  it("accepts a page built from every block kind", () => {
    const sections = PAGE_SECTION_KINDS.slice(0, 40).map((k, i) =>
      section(sectionFixtures[k], `c${i}`),
    );
    const r = MinistrySectionsManifestSchema.safeParse({ sections });
    if (!r.success) throw new Error(JSON.stringify(r.error.issues, null, 2));
    expect(r.data.sections).toHaveLength(PAGE_SECTION_KINDS.length);
  });

  it("caps a page at 40 sections", () => {
    const build = (n: number) => ({
      sections: Array.from({ length: n }, (_, i) =>
        section({ kind: "rich_text", html: "<p>x</p>" }, `c${i}`),
      ),
    });
    expect(MinistrySectionsManifestSchema.safeParse(build(40)).success).toBe(true);
    expect(MinistrySectionsManifestSchema.safeParse(build(41)).success).toBe(false);
  });

  it("rejects the whole manifest when one section is malformed", () => {
    const manifest = {
      sections: [
        section({ kind: "rich_text", html: "<p>fine</p>" }, "a"),
        section({ kind: "staff_card", staffId: "nope" }, "b"),
      ],
    };
    expect(MinistrySectionsManifestSchema.safeParse(manifest).success).toBe(false);
  });

  it("accepts an empty clientId for a brand new row", () => {
    const r = MinistrySectionsManifestSchema.safeParse({
      sections: [section({ kind: "rich_text", html: "<p>new</p>" }, "")],
    });
    expect(r.success).toBe(true);
  });
});

describe("fixtures stay honest", () => {
  it("uses a real uuid for the staff fixture", () => {
    expect(parse({ kind: "staff_card", staffId: STAFF_ID }).success).toBe(true);
  });
});
