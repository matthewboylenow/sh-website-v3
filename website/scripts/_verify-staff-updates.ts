/** Post-apply verification: names, leads, custom fields, cleanups. */
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  ministries,
  ministryLeads,
  pageSections,
  siteSettings,
  users,
} from "../db/schema";

async function main() {
  // 1. Renames
  const renamed = await db
    .select({ slug: ministries.slug, name: ministries.name })
    .from(ministries);
  const bySlug = new Map(renamed.map((r) => [r.slug, r.name]));
  const expect: [string, string][] = [
    ["lectors", "Lector Ministry"],
    ["sacristans", "Sacristan Ministry"],
    ["soup-kitchens-st-joe-s", "Saint Joseph's Soup Kitchen"],
    ["soup-kitchens-st-mary-s", "Saint Mary's Soup Kitchen"],
    ["sunday-gospel-alive-in-me", "Sunday Gospel Alive in Me (GAIM)"],
    ["westfield-food-pantry", "Westfield Food Pantry Ministry"],
    ["kids-corner", "Kids Corner (Ages 2-5)"],
    ["young-adult-ministry", "Abide Young Adult Ministry (Ages 21-35)"],
    ["pre-cana", "Pre-Cana Marriage Preparation"],
  ];
  console.log("== Renames ==");
  for (const [slug, want] of expect) {
    const got = bySlug.get(slug);
    console.log(`${got === want ? "OK  " : "FAIL"} ${slug}: "${got}"`);
  }

  // 2. Lead counts + emails per ministry
  console.log("\n== Leads ==");
  const leadRows = await db
    .select({ slug: ministries.slug, email: users.email, role: users.role })
    .from(ministryLeads)
    .innerJoin(ministries, eq(ministryLeads.ministryId, ministries.id))
    .innerJoin(users, eq(ministryLeads.userId, users.id))
    .orderBy(asc(ministries.slug));
  const grouped = new Map<string, string[]>();
  for (const r of leadRows) {
    grouped.set(r.slug, [...(grouped.get(r.slug) ?? []), r.email]);
  }
  for (const [slug, emails] of grouped) console.log(`${slug}: ${emails.join(", ")}`);
  console.log(`total lead links: ${leadRows.length}`);

  // 3. Custom fields + volunteer buttons
  console.log("\n== Inquiry configs ==");
  for (const slug of [
    "baptism-ministry",
    "contemplatives",
    "garden-ministry",
    "young-adult-ministry",
    "adoration",
    "pre-cana",
  ]) {
    const [m] = await db
      .select({ cfg: ministries.inquiryConfig })
      .from(ministries)
      .where(eq(ministries.slug, slug))
      .limit(1);
    const cfg = m?.cfg;
    const customs = (cfg?.fields ?? []).filter((f) => f.kind === "custom");
    console.log(
      `${slug}: buttons=[${(cfg?.buttons ?? []).filter((b) => b.enabled).map((b) => b.kind).join(",")}] custom=[${customs.map((f) => `${f.type}:${f.label.slice(0, 40)}`).join(" | ")}]`,
    );
  }

  // 4. CLOW anchor sanity (single anchor, no nesting)
  console.log("\n== CLOW anchor ==");
  const [clow] = await db
    .select({ id: ministries.id })
    .from(ministries)
    .where(eq(ministries.slug, "childrens-liturgy-of-the-word"))
    .limit(1);
  const clowSections = await db
    .select({ payload: pageSections.payload })
    .from(pageSections)
    .where(and(eq(pageSections.parentKind, "ministry"), eq(pageSections.parentId, clow!.id)));
  const clowJson = JSON.stringify(clowSections);
  const anchorCount = (clowJson.match(/virtusonline\.org/g) ?? []).length;
  const nested = /<a [^>]*virtusonline[^>]*>\s*<a /.test(clowJson.replace(/\\"/g, '"'));
  console.log(`virtusonline refs: ${anchorCount} (expect 2 — href appears once, twice with escaping variance), nested: ${nested}`);
  console.log(`CLOW button-note present: ${clowJson.includes("Description")}`);

  // 5. Pre-Cana intro count (exactly one)
  console.log("\n== Pre-Cana intro ==");
  const [pc] = await db
    .select({ id: ministries.id })
    .from(ministries)
    .where(eq(ministries.slug, "pre-cana"))
    .limit(1);
  const pcSections = await db
    .select({ payload: pageSections.payload })
    .from(pageSections)
    .where(and(eq(pageSections.parentKind, "ministry"), eq(pageSections.parentId, pc!.id)));
  const pcJson = JSON.stringify(pcSections);
  const introCount = (pcJson.match(/Preparing for a Lifetime of Love in Christ/g) ?? []).length;
  const schedCount = (pcJson.match(/Program Schedule/g) ?? []).length;
  console.log(`intro headings: ${introCount} (expect 1), schedule headings: ${schedCount} (expect 1)`);
  console.log(`spring-2026 sentence present: ${pcJson.includes("spring 2026 session has already taken place")}`);

  // 6. Redirects
  const [s] = await db
    .select({ redirects: siteSettings.redirects })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  const list = (s?.redirects ?? []) as { from: string; to: string }[];
  console.log("\n== Redirects ==");
  for (const from of ["/veg-garden", "/kids-corner"]) {
    const hitRow = list.find((r) => r.from === from);
    console.log(`${hitRow ? "OK  " : "FAIL"} ${from} → ${hitRow?.to ?? "(none)"}`);
  }

  // 7. No leftover editorial artifacts / broken emails anywhere
  console.log("\n== Leftover artifacts across all ministry sections ==");
  const allSections = await db
    .select({ payload: pageSections.payload })
    .from(pageSections)
    .where(eq(pageSections.parentKind, "ministry"));
  const blob = JSON.stringify(allSections);
  for (const needle of [
    "button linking to standalone",
    "Remove Abide Test webpage",
    "cdn-cgi/l/email-protection",
    "Use the form below and we will be in touch",
  ]) {
    const n = (blob.match(new RegExp(needle.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&"), "g")) ?? []).length;
    console.log(`${n === 0 ? "OK  " : "WARN"} "${needle}": ${n}`);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
