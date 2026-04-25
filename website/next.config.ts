import type { NextConfig } from "next";

/**
 * For v1 we serve uploaded assets directly from Vercel Blob's
 * *.public.blob.vercel-storage.com host. Asset URLs are stored
 * verbatim in `blob_assets.blob_url` and rendered through next/image.
 *
 * If we later want to brand asset URLs as `sainthelen.org/cdn/...`,
 * set BLOB_STORE_HOST and uncomment the rewrite below — no migration
 * needed because we always derive the public URL via lib/blob.ts.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async rewrites() {
    const host = process.env.BLOB_STORE_HOST;
    if (!host) return [];
    return [
      {
        source: "/cdn/:path*",
        destination: `https://${host}/:path*`,
      },
    ];
  },
};

export default nextConfig;
