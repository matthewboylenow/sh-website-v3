"use client";

/**
 * Branded runtime error boundary. Without this file a data hiccup shows
 * Next's unstyled crash page to parishioners — the one screen where the
 * site most needs to keep its composure.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAF9F7",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#A73F25",
            margin: 0,
          }}
        >
          Something went wrong
        </p>
        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 32,
            lineHeight: 1.2,
            color: "#1F346D",
            margin: "12px 0 16px",
          }}
        >
          We couldn&rsquo;t load this page.
        </h1>
        <p style={{ color: "#3A3A3A", lineHeight: 1.65, margin: "0 0 28px" }}>
          It&rsquo;s us, not you. Try again in a moment — or call the parish
          office at 908-232-1214 if you need something right away.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#CD5334",
            color: "#fff",
            border: 0,
            borderRadius: 999,
            padding: "12px 28px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
