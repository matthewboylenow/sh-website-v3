/**
 * Seed the site_settings singleton row.
 *
 * Idempotent: upserts by id=1. Safe to re-run. Values here are parish
 * defaults that editors are expected to refine via /admin/settings once
 * the admin UI ships (Step 4).
 */

import { db } from "../index";
import { siteSettings } from "../schema";

export async function seedSiteSettings() {
  await db
    .insert(siteSettings)
    .values({
      id: 1,
      contactEmail: "parish@sainthelen.org",
      contactPhone: "(908) 232-1214",
      address: {
        street: "1600 Rahway Avenue",
        city: "Westfield",
        state: "NJ",
        zip: "07090",
      },
      socialLinks: {
        facebook: "https://facebook.com/sainthelenwestfield",
        youtube: undefined,
        instagram: undefined,
      },
      welcomeFormRecipients: ["mboyle@sainthelen.org"],
      giving: {
        primaryUrl: "", // populated from /admin/settings/giving when Touchpoint URLs are provided
      },
      footerCopy: "A Roman Catholic parish in the Archdiocese of Newark.",
      densityScale: "1.00",
    })
    .onConflictDoNothing({ target: siteSettings.id });

  console.log("  ✓ site_settings (id=1)");
}
