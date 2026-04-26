"use client";

import { useEffect, useRef } from "react";

/**
 * Video player. mp4 → native <video src>. hls → dynamically imports
 * hls.js only when needed (Safari has native HLS, everyone else needs
 * the polyfill). YouTube/Vimeo go through the Embed block, not here.
 */

export function VideoBlock({
  url,
  type,
  poster,
}: {
  url: string;
  type: "mp4" | "hls" | "youtube" | "vimeo";
  poster?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (type !== "hls") return;
    const video = videoRef.current;
    if (!video) return;

    // Safari + iOS handle HLS natively.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      return;
    }

    // Everyone else: dynamic-import hls.js.
    let hls: { destroy: () => void } | null = null;
    (async () => {
      try {
        const Hls = (await import("hls.js")).default;
        if (Hls.isSupported()) {
          hls = new Hls();
          (hls as unknown as { loadSource: (u: string) => void; attachMedia: (v: HTMLMediaElement) => void }).loadSource(
            url,
          );
          (hls as unknown as { attachMedia: (v: HTMLMediaElement) => void }).attachMedia(video);
        }
      } catch {
        // hls.js not installed yet — fall back to direct src.
        video.src = url;
      }
    })();

    return () => {
      hls?.destroy();
    };
  }, [type, url]);

  if (type === "youtube" || type === "vimeo") {
    // These should be authored as Embed blocks, but render a sane
    // fallback if a user picked them on the Video block by accident.
    return (
      <div className="rounded-lg border border-dashed border-rule bg-cream/40 p-4 text-sm text-ink-3">
        Use the Embed block for {type} videos.
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      preload="metadata"
      poster={poster}
      className="aspect-video w-full rounded-lg bg-black"
      src={type === "mp4" ? url : undefined}
    />
  );
}
