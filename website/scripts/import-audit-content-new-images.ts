/**
 * Companion to import-audit-images.ts — uploads the handful of hero
 * images that live under content-new/ministries__<slug>/images/ but
 * were never pulled into public-ready/images-renamed/ (the audit team
 * added them post-scrape). Same key convention: `audit/<filename>`.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { blobAssets } from "../db/schema";

const AUDIT_ROOT =
  process.env.AUDIT_ROOT ??
  "/workspaces/sh-website-v3/tmp/revamp-extract/sainthelen-revamp";

function mimeOf(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN not set.");
  }
  const baseDir = path.join(AUDIT_ROOT, "content-new");
  const dirs = await readdir(baseDir);
  let uploaded = 0;
  for (const dir of dirs) {
    const imagesDir = path.join(baseDir, dir, "images");
    try {
      await stat(imagesDir);
    } catch {
      continue;
    }
    const files = await readdir(imagesDir);
    for (const f of files) {
      if (f.startsWith(".")) continue;
      const filePath = path.join(imagesDir, f);
      const buf = await readFile(filePath);
      const key = `audit/${f}`;
      const contentType = mimeOf(f);
      const blob = await put(key, buf, {
        access: "public",
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      // Derive a sensible alt from the filename: "art-environment-ministry-hero" → "Art environment ministry hero"
      const stem = f.replace(/\.[^.]+$/, "");
      const alt = stem.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      await db
        .insert(blobAssets)
        .values({
          key,
          blobUrl: blob.url,
          mimeType: contentType,
          byteSize: buf.byteLength,
          alt,
          credit: "audit-role:hero",
          uploadedBy: null,
        })
        .onConflictDoUpdate({
          target: blobAssets.key,
          set: {
            blobUrl: blob.url,
            mimeType: contentType,
            byteSize: buf.byteLength,
            alt: sql`COALESCE(${blobAssets.alt}, EXCLUDED.alt)`,
          },
        });
      console.log(`  ✓ ${key} (${buf.byteLength} bytes)`);
      uploaded++;
    }
  }
  console.log(`\n✓ uploaded ${uploaded} content-new image(s).`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
