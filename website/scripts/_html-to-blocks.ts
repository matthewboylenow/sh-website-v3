/**
 * Heuristic HTML → page_sections converter for the May 2026 audit import.
 *
 * Takes the sanitized HTML produced by mdToSafeHtml() and breaks it into
 * proper page_sections blocks:
 *
 *   - Split on every `<h2>` and `<h3>` boundary → one `heading` block per
 *     header, followed by a `rich_text` block holding the prose until the
 *     next header.
 *   - A blockquote containing a long inline quote ("….") OR Scripture-style
 *     attribution becomes a `callout_banner` block instead of staying buried
 *     in rich_text.
 *   - A list whose items each start with a strong/em-tagged label (e.g.
 *     "Our *Design Guild* is made up of…") becomes a `card_grid` of cards,
 *     one per labeled item.
 *
 * No DOM parser — input is the output of marked + sanitize-html, which is
 * predictable enough for regex-based segmentation.
 */

import type { PageSectionPayload, CardGridCard } from "../db/schema";

/**
 * Walk top-level children by scanning balanced top-level tags. Returns an
 * array of self-contained HTML fragments (each is either an h2/h3 element,
 * a single <p>, a <ul>/<ol>, a <blockquote>, etc).
 */
function splitTopLevel(html: string): string[] {
  const out: string[] = [];
  const tagRe = /<(h[1-6]|p|ul|ol|blockquote|pre|hr|div)(?:\s[^>]*)?>/i;
  let rest = html.trim();
  while (rest.length > 0) {
    const m = rest.match(tagRe);
    if (!m) {
      // Trailing text — keep it as a rich_text fragment if non-trivial.
      const trimmed = rest.trim();
      if (trimmed) out.push(`<p>${trimmed}</p>`);
      break;
    }
    if (m.index! > 0) {
      const leading = rest.slice(0, m.index!).trim();
      if (leading) out.push(`<p>${leading}</p>`);
    }
    const tag = m[1]!.toLowerCase();
    if (tag === "hr") {
      out.push("<hr/>");
      rest = rest.slice(m.index! + m[0].length).replace(/^\s+/, "");
      continue;
    }
    // Find the matching close tag, respecting nesting.
    const openRe = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "gi");
    const closeRe = new RegExp(`</${tag}>`, "gi");
    openRe.lastIndex = m.index!;
    let depth = 1;
    let cursor = m.index! + m[0].length;
    while (depth > 0) {
      openRe.lastIndex = cursor;
      closeRe.lastIndex = cursor;
      const nextOpen = openRe.exec(rest);
      const nextClose = closeRe.exec(rest);
      if (!nextClose) {
        // Unclosed tag — bail with the rest as a single fragment.
        out.push(rest.slice(m.index!));
        return out;
      }
      if (nextOpen && nextOpen.index < nextClose.index) {
        depth++;
        cursor = nextOpen.index + nextOpen[0].length;
      } else {
        depth--;
        cursor = nextClose.index + nextClose[0].length;
      }
    }
    out.push(rest.slice(m.index!, cursor));
    rest = rest.slice(cursor).replace(/^\s+/, "");
  }
  return out;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Inner HTML / text of a single tag, e.g. `<h2>Foo</h2>` → "Foo". */
function innerHtml(frag: string): string {
  const m = frag.match(/^<[a-z0-9]+(?:\s[^>]*)?>([\s\S]*)<\/[a-z0-9]+>$/i);
  return m ? m[1]! : frag;
}

/** Returns the heading level (2/3) if frag is an H-tag, else null. */
function headingLevel(frag: string): 2 | 3 | null {
  const m = frag.match(/^<(h[23])(?:\s[^>]*)?>/i);
  if (!m) return null;
  return m[1]!.toLowerCase() === "h2" ? 2 : 3;
}

/**
 * Detect a "labeled-list" pattern — a blockquote or list whose direct
 * children are paragraphs/items each starting with a strong/em-tagged
 * label. Returns the parsed cards if it matches, or null otherwise.
 */
function asLabeledCards(frag: string): CardGridCard[] | null {
  const lower = frag.toLowerCase();
  if (!lower.startsWith("<blockquote") && !lower.startsWith("<ul") && !lower.startsWith("<ol"))
    return null;
  const inner = innerHtml(frag);
  // Per-child fragments: paragraphs (in blockquote) or list items (in ul/ol).
  const childRe = lower.startsWith("<blockquote")
    ? /<p[^>]*>([\s\S]*?)<\/p>/gi
    : /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const matches = [...inner.matchAll(childRe)];
  if (matches.length < 3) return null;
  const cards: CardGridCard[] = [];
  for (const m of matches) {
    const html = m[1]!;
    // Label = first <strong>…</strong> or <em>…</em>
    const label = html.match(/<(strong|em)[^>]*>([\s\S]*?)<\/\1>/i);
    if (!label) return null;
    const title = decodeEntities(stripTags(label[2]!)).trim();
    if (!title || title.length > 60) return null;
    // Summary = remaining text, stripped of the label
    const summary = decodeEntities(
      stripTags(html.replace(label[0]!, "").replace(/^[\s,:.—–-]+/, "")),
    );
    if (!summary || summary.length < 20) return null;
    cards.push({ title, summary });
  }
  return cards.length >= 3 ? cards : null;
}

/**
 * Public API: take sanitized HTML, return an ordered list of section
 * payloads ready to insert into page_sections.
 */
export function htmlToBlocks(html: string): PageSectionPayload[] {
  const fragments = splitTopLevel(html);
  if (fragments.length === 0) return [];

  const out: PageSectionPayload[] = [];
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    const joined = buffer.join("\n").trim();
    if (joined && stripTags(joined).trim()) {
      out.push({ kind: "rich_text", html: joined } as PageSectionPayload);
    }
    buffer = [];
  };

  for (const frag of fragments) {
    const hLevel = headingLevel(frag);
    if (hLevel !== null) {
      flushBuffer();
      const heading = decodeEntities(stripTags(innerHtml(frag))).trim();
      if (heading) {
        out.push({
          kind: "heading",
          level: hLevel,
          header: { heading },
        } as PageSectionPayload);
      }
      continue;
    }
    // Try special-case conversions before falling back to rich_text.
    const cards = asLabeledCards(frag);
    if (cards) {
      flushBuffer();
      out.push({
        kind: "card_grid",
        cards,
        layout: "uniform",
        columns: cards.length >= 4 ? 3 : 2,
        cardStyle: "stacked",
      } as PageSectionPayload);
      continue;
    }
    buffer.push(frag);
  }
  flushBuffer();
  return out;
}
