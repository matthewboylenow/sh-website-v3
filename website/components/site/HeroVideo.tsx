"use client";

/**
 * Full-bleed video hero. Reads URLs from NEXT_PUBLIC_ env vars so the
 * site can deploy without one — falls back to a navy gradient + the
 * provided poster. Honors prefers-reduced-motion automatically.
 *
 * Swap point: set NEXT_PUBLIC_HERO_VIDEO_URL (and optionally
 * NEXT_PUBLIC_HERO_VIDEO_POSTER) in Vercel env vars. Use a hosted
 * Mux/Cloudflare Stream MP4 — direct Vercel Blob hosting works for
 * small clips but is not ideal for >5 MB loops.
 */

export function HeroVideo({
  videoUrl,
  posterUrl,
  children,
}: {
  videoUrl?: string;
  posterUrl?: string;
  children: React.ReactNode;
}) {
  const hasVideo = Boolean(videoUrl);

  return (
    <section className="relative isolate min-h-[640px] overflow-hidden bg-navy text-white sm:min-h-[720px]">
      {/* Background layer ----------------------------------------- */}
      <div className="absolute inset-0 -z-10">
        {hasVideo ? (
          <video
            className="size-full object-cover motion-reduce:hidden"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={posterUrl}
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : null}
        {/* Poster fallback. Shown when no video URL OR when motion
            is reduced (the video above is hidden by motion-reduce). */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 ${hasVideo ? "motion-reduce:block hidden" : "block"}`}
          style={
            posterUrl
              ? {
                  backgroundImage: `url(${posterUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        />
        {/* Navy → black gradient stays under the video for legibility
            of the white text + CTAs. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-navy/80 via-navy/55 to-black/70"
        />
        {!hasVideo && !posterUrl && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-navy via-navy-dark to-black"
          />
        )}
      </div>

      {children}
    </section>
  );
}
