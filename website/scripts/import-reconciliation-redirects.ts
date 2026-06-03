/**
 * Merges the June 2026 reconciliation bundle's two redirect manifests
 * (standalones + retired, plus the 41 legacy full-site map) into
 * siteSettings.redirects. Reuses the same shape as
 * import-audit-redirects.ts — audit takes priority on collision.
 *
 *   AUDIT_ROOT="/workspaces/sh-website-v3/sh-nextjs-reconciliation/sh-nextjs-reconciliation" \
 *     pnpm tsx --env-file=.env.local scripts/import-reconciliation-redirects.ts
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { siteSettings, type Redirect } from "../db/schema";

const AUDIT_ROOT =
  process.env.AUDIT_ROOT ??
  "/workspaces/sh-website-v3/sh-nextjs-reconciliation/sh-nextjs-reconciliation";

type AuditRedirect = {
  source: string;
  destination: string;
  permanent?: boolean;
  _note?: string;
};

const MANIFESTS = [
  "manifests/redirects-nextjs.json",
  "manifests/redirects-legacy-fullsite.json",
] as const;

async function loadManifest(rel: string): Promise<AuditRedirect[]> {
  const raw = await readFile(path.join(AUDIT_ROOT, rel), "utf8");
  const parsed = JSON.parse(raw) as { redirects: AuditRedirect[] };
  return parsed.redirects;
}

async function main() {
  const merged: AuditRedirect[] = [];
  for (const m of MANIFESTS) {
    const items = await loadManifest(m);
    console.log(`  ${m} : ${items.length} entries`);
    merged.push(...items);
  }
  const incoming = merged.map<Redirect>((r) => ({
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
  for (const r of incoming) {
    if (byFrom.has(r.from)) overwritten++;
    else added++;
    byFrom.set(r.from, r);
  }
  const finalSet = Array.from(byFrom.values()).sort((a, b) =>
    a.from.localeCompare(b.from),
  );

  await db
    .update(siteSettings)
    .set({ redirects: finalSet })
    .where(eq(siteSettings.id, 1));

  const reviewNotes = merged.filter((r) => r._note?.includes("REVIEW"));

  console.log(`\nexisting redirects : ${existing.length}`);
  console.log(`incoming total     : ${incoming.length}`);
  console.log(`  added            : ${added}`);
  console.log(`  overwritten      : ${overwritten}`);
  console.log(`total now in DB    : ${finalSet.length}`);

  if (reviewNotes.length > 0) {
    console.log(
      `\n⚠ ${reviewNotes.length} entries marked REVIEW — verify targets in /admin/settings/redirects before launch:`,
    );
    for (const r of reviewNotes) {
      console.log(`    ${r.source.padEnd(40)} → ${r.destination.padEnd(34)} (${r._note})`);
    }
  }
  console.log(
    "\nMiddleware reads /api/redirects with 300s revalidation. Save /admin/settings/redirects to force an immediate cache bust if needed.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
