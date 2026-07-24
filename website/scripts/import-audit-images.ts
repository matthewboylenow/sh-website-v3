/**
 * Phase 1 of the May 2026 pre-launch audit import.
 *
 * Walks /tmp/revamp-extract/sainthelen-revamp/public-ready/images-renamed/,
 * uploads each file to Vercel Blob under the key `audit/<filename>`, and
 * inserts/upserts a row in blob_assets with metadata pulled from
 * manifests/images.csv (alt, AI-generated description, width, height).
 *
 * Idempotent: if blob_assets already has a row for a key, the file is
 * re-uploaded (Blob put is idempotent for same content) and the DB row
 * gets its non-null fields refreshed. Safe to re-run.
 *
 * Side-effect: writes ../tmp/revamp-extract/sainthelen-revamp/manifests/blob-key-map.json
 * mapping `new_filename` → `{ key, blobUrl }` for use by Phase 2.
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { blobAssets } from "../db/schema";

const AUDIT_ROOT =
  process.env.AUDIT_ROOT ??
  "/workspaces/sh-website-v3/tmp/revamp-extract/sainthelen-revamp";
const IMAGE_DIR = path.join(AUDIT_ROOT, "public-ready/images-renamed");
const CSV_PATH = path.join(AUDIT_ROOT, "manifests/images.csv");
const KEY_MAP_PATH = path.join(AUDIT_ROOT, "manifests/blob-key-map.json");

type CsvRow = {
  alt: string;
  width: string;
  height: string;
  bytes: string;
  hash: string;
  role: string;
  new_filename: string;
  what_i_see: string;
  confidence: string;
  page_url: string;
};

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]!);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row as unknown as CsvRow);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function mimeOf(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN not set — cannot upload to Vercel Blob.");
  }

  console.log("Reading images.csv …");
  const csv = parseCsv(await readFile(CSV_PATH, "utf8"));

  // Build per-filename metadata. Multiple rows can reference the same
  // new_filename (image reused across pages); prefer the row with the
  // most descriptive `what_i_see` and highest confidence.
  const metaByFile = new Map<string, CsvRow>();
  for (const row of csv) {
    if (!row.new_filename) continue;
    const prior = metaByFile.get(row.new_filename);
    if (!prior) {
      metaByFile.set(row.new_filename, row);
      continue;
    }
    const better =
      (row.confidence === "high" && prior.confidence !== "high") ||
      (row.what_i_see.length > prior.what_i_see.length &&
        row.confidence === prior.confidence);
    if (better) metaByFile.set(row.new_filename, row);
  }

  let files = (await readdir(IMAGE_DIR)).sort();
  const limit = process.env.LIMIT ? Number.parseInt(process.env.LIMIT, 10) : null;
  if (limit && Number.isFinite(limit)) {
    console.log(`LIMIT=${limit} — smoke run only.`);
    files = files.slice(0, limit);
  }
  console.log(`Processing ${files.length} renamed images.\n`);

  const keyMap: Record<string, { key: string; blobUrl: string; alt: string | null }> = {};
  let uploaded = 0;
  const skipped = 0;
  let failed = 0;

  for (const filename of files) {
    const meta = metaByFile.get(filename);
    const key = `audit/${filename}`;
    const filePath = path.join(IMAGE_DIR, filename);
    try {
      const buf = await readFile(filePath);
      const contentType = mimeOf(filename);

      // Prefer the AI-generated description over the original alt
      // (often empty or "saint helen"). Trim trailing periods to feel
      // less like AI copy.
      const aiAlt = meta?.what_i_see?.trim().replace(/\.$/, "");
      const origAlt = meta?.alt?.trim();
      const alt = aiAlt && aiAlt.length > 0 ? aiAlt : origAlt || null;
      const width = meta?.width ? Number.parseInt(meta.width, 10) : null;
      const height = meta?.height ? Number.parseInt(meta.height, 10) : null;
      const credit = meta?.role ? `audit-role:${meta.role}` : null;

      const blob = await put(key, buf, {
        access: "public",
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });

      await db
        .insert(blobAssets)
        .values({
          key,
          blobUrl: blob.url,
          mimeType: contentType,
          byteSize: buf.byteLength,
          width: Number.isFinite(width) ? width : null,
          height: Number.isFinite(height) ? height : null,
          alt,
          caption: null,
          credit,
          uploadedBy: null,
        })
        .onConflictDoUpdate({
          target: blobAssets.key,
          set: {
            blobUrl: blob.url,
            mimeType: contentType,
            byteSize: buf.byteLength,
            width: Number.isFinite(width) ? width : null,
            height: Number.isFinite(height) ? height : null,
            alt: sql`COALESCE(${blobAssets.alt}, EXCLUDED.alt)`,
            credit: sql`COALESCE(${blobAssets.credit}, EXCLUDED.credit)`,
          },
        });

      keyMap[filename] = { key, blobUrl: blob.url, alt };
      uploaded++;
      if (uploaded % 25 === 0) console.log(`  uploaded ${uploaded}/${files.length} …`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${filename}: ${(err as Error).message}`);
    }
  }

  await writeFile(KEY_MAP_PATH, JSON.stringify(keyMap, null, 2));
  console.log(`\n✓ uploaded: ${uploaded}`);
  console.log(`  skipped : ${skipped}`);
  console.log(`  failed  : ${failed}`);
  console.log(`  key map : ${KEY_MAP_PATH}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
