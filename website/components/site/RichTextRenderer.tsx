import { sanitizeHtml } from "@/lib/sanitize";

/**
 * Renders sanitized rich-text HTML produced by the admin editor.
 * Server Component — sanitization happens at render time (cheap),
 * not at write time, so we can keep stored content lossless.
 *
 * Pass `className` to override or extend the default prose styles.
 */
export function RichTextRenderer({
  html,
  className = "",
}: {
  html: string | null | undefined;
  className?: string;
}) {
  if (!html) return null;
  const safe = sanitizeHtml(html);
  return (
    <div
      className={`sh-prose ${className}`}
      // Sanitized at render. DOMPurify drops everything outside the
      // allowlist before we hand the string to React.
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
