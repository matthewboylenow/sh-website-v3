/**
 * Wave 18.3 — OCIA form + prayer request wiring (data half).
 *
 * Code half ships in the same commit: /ocia-form intake page + /api/ocia,
 * /prayers page + /api/prayer-request. This script:
 *
 *   1. Seeds ociaFormRecipients + prayerFormRecipients from the live
 *      FluentForms notification settings (fill-only-if-empty).
 *   2. Removes the "/ocia-form → /become-catholic" redirect — it would
 *      shadow the new /ocia-form route.
 *   3. Appends a button_group section to the become-catholic page linking
 *      to the inquirer form (skipped if any section already links it).
 *
 * Requires migration 0023 (ocia/prayer recipient columns) to be applied.
 * Idempotent. DRY_RUN=1 to preview.
 */

import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  pages,
  pageSections,
  siteSettings,
  type PageSectionPayload,
} from "../db/schema";

const DRY_RUN = process.env.DRY_RUN === "1";

const OCIA_RECIPIENTS = [
  "OCIA@sainthelen.org",
  "faith@sainthelen.org",
  "mike.murphy@comcast.net",
  "llphd@yahoo.com",
];
const PRAYER_RECIPIENTS = [
  "Prayer@sainthelen.org",
  "reginacook1022@gmail.com",
  "tnydegger@sainthelen.org",
];

async function main() {
  console.log(`Wave 18.3 — OCIA + prayer wiring${DRY_RUN ? " (DRY RUN)" : ""}\n`);

  // 1. Recipients (fill-only-if-empty).
  const [s] = await db
    .select({
      ocia: siteSettings.ociaFormRecipients,
      prayer: siteSettings.prayerFormRecipients,
      redirects: siteSettings.redirects,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!s) throw new Error("site_settings singleton missing");

  const set: Record<string, unknown> = {};
  if (!s.ocia?.length) set.ociaFormRecipients = OCIA_RECIPIENTS;
  if (!s.prayer?.length) set.prayerFormRecipients = PRAYER_RECIPIENTS;

  // 2. Drop the shadowing redirect.
  const redirects = (s.redirects ?? []).filter((r) => r.from !== "/ocia-form");
  const droppedRedirect = redirects.length !== (s.redirects ?? []).length;
  if (droppedRedirect) set.redirects = redirects;

  if (Object.keys(set).length && !DRY_RUN) {
    await db.update(siteSettings).set(set).where(eq(siteSettings.id, 1));
  }
  console.log(
    `  settings: ${Object.keys(set).length ? Object.keys(set).join(", ") : "nothing to change"}`,
  );

  // 3. become-catholic CTA to the inquirer form.
  const [bc] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.slug, "become-catholic"))
    .limit(1);
  if (!bc) {
    console.log("  become-catholic page not found — skipping CTA");
    return;
  }
  const sections = await db
    .select({ id: pageSections.id, position: pageSections.position, payload: pageSections.payload })
    .from(pageSections)
    .where(and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, bc.id)))
    .orderBy(asc(pageSections.position));
  const alreadyLinked = JSON.stringify(sections).includes("/ocia-form");
  if (alreadyLinked) {
    console.log("  become-catholic already links /ocia-form — skipping CTA");
    return;
  }
  const cta: PageSectionPayload = {
    kind: "button_group",
    header: {
      eyebrow: "Ready for a conversation?",
      heading: "Start with the OCIA Inquirer Form",
      subheading:
        "No commitment — it just helps our team meet you where you are.",
    },
    items: [
      { label: "OCIA Inquirer Form", href: "/ocia-form", variant: "primary" },
    ],
  };
  if (!DRY_RUN) {
    await db.insert(pageSections).values({
      parentKind: "page",
      parentId: bc.id,
      position: (sections[sections.length - 1]?.position ?? -1) + 1,
      kind: cta.kind,
      payload: cta,
    });
  }
  console.log("  become-catholic: OCIA CTA section appended");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
