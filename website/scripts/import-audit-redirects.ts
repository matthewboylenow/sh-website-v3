/**
 * Phase 3 of the May 2026 pre-launch audit import.
 *
 * Merges the audit team's 301-redirect manifest into siteSettings.redirects
 * (JSONB array, admin-managed at /admin/settings/redirects, consumed by
 * Edge middleware). Renames source→from and destination→to to match our
 * schema shape, drops the `_note` field, and unions with any redirects
 * already present (audit takes priority on key collision).
 *
 * Cache: the in-memory cache in middleware/api refreshes every 300s, or
 * sooner when an admin saves the redirects page (which calls
 * revalidateTag("redirects")). After running this script, either wait
 * five minutes or visit /admin/settings/redirects and click Save to
 * force an immediate bust.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { siteSettings, type Redirect } from "../db/schema";

const AUDIT_ROOT =
  process.env.AUDIT_ROOT ??
  "/workspaces/sh-website-v3/tmp/revamp-extract/sainthelen-revamp";

type AuditRedirect = {
  source: string;
  destination: string;
  permanent?: boolean;
  _note?: string;
};

async function main() {
  const raw = await readFile(path.join(AUDIT_ROOT, "manifests/redirects.json"), "utf8");
  const parsed = JSON.parse(raw) as { redirects: AuditRedirect[] };
  const audit = parsed.redirects.map<Redirect>((r) => ({
    from: r.source,
    to: r.destination,
    permanent: r.permanent ?? false,
  }));

  const [row] = await db
    .select({ redirects: siteSettings.redirects })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!row) throw new Error("siteSettings row not found.");

  const existing = row.redirects ?? [];
  const byFrom = new Map<string, Redirect>();
  for (const r of existing) byFrom.set(r.from, r);
  let added = 0;
  let overwritten = 0;
  for (const r of audit) {
    if (byFrom.has(r.from)) overwritten++;
    else added++;
    byFrom.set(r.from, r);
  }
  const merged = Array.from(byFrom.values()).sort((a, b) => a.from.localeCompare(b.from));

  await db
    .update(siteSettings)
    .set({ redirects: merged })
    .where(eq(siteSettings.id, 1));

  console.log(`existing redirects : ${existing.length}`);
  console.log(`audit redirects    : ${audit.length}`);
  console.log(`  added            : ${added}`);
  console.log(`  overwritten      : ${overwritten}`);
  console.log(`total now in DB    : ${merged.length}`);
  console.log(`\nWrote rules:`);
  for (const r of audit) {
    const tag = r.permanent ? "308" : "307";
    console.log(`  [${tag}] ${r.from}  →  ${r.to}`);
  }
  console.log(
    "\nMiddleware reads /api/redirects with 300s revalidation. Visit /admin/settings/redirects and Save to force an immediate cache bust if needed.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
