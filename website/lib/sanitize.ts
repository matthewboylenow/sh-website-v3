import sanitize from "sanitize-html";

/**
 * Strict HTML allowlist for the rich-text editor's output. Tightened
 * deliberately — we never want raw script/style/iframe to reach the
 * page from user-authored content. Embedded content (YouTube, etc.)
 * arrives later through the dedicated embed block (Wave 13), which
 * uses sandboxed iframes and a server-side allowlist.
 *
 * Pure JS — no DOM dependency, runs in Edge + Node + browser bundles.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "code",
  "blockquote",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "img",
];

/**
 * Sanitize HTML produced by the rich-text editor. Safe to use on
 * server-side (Server Components, Route Handlers, Edge) AND
 * client-side. Returns a string — call sites that render must use
 * `dangerouslySetInnerHTML`.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return sanitize(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "data-blob-key"],
    },
    // Single allowlisted class: `sh-pending` marks staff-facing
    // "content still needed here" notes (red bold italic via
    // globals.css) so gaps stay visible during content review.
    allowedClasses: {
      p: ["sh-pending"],
      em: ["sh-pending"],
      strong: ["sh-pending"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    transformTags: {
      // Force every link to noopener noreferrer + new tab so user-
      // authored anchors can't break out of our app context.
      a: sanitize.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}

/**
 * Strip all HTML and return plain text — handy for meta descriptions,
 * card previews, search snippets.
 */
export function htmlToPlainText(html: string, maxChars = 240): string {
  const stripped = sanitize(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= maxChars) return stripped;
  return stripped.slice(0, maxChars - 1).trimEnd() + "…";
}
