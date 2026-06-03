/**
 * Updates siteSettings.nav with the 7-item top nav approved May 2026.
 *
 * Plain English labels, every click goes to a real destination, with
 * optional hover mega-menus on Mass and About for additional
 * discoverability. Designed to balance newcomer onboarding, regular
 * parishioner navigation, and tech-illiterate 65+ users who scan the
 * top bar looking for plain-English labels.
 *
 * Each mega only opens on hover/focus; clicking the top-level label
 * still resolves to a meaningful destination (Mass → /mass,
 * About → /p/pastoral-council).
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { siteSettings, type NavManifest } from "../db/schema";

const NAV: NavManifest = {
  items: [
    { label: "I'm New", href: "/im-new" },
    {
      label: "Mass",
      href: "/mass",
      mega: {
        sections: [
          {
            heading: "Worship & sacraments",
            links: [
              { label: "Mass Times", href: "/mass" },
              { label: "Sacraments", href: "/sacraments" },
              { label: "Watch Online", href: "/p/live" },
              { label: "Prayer Requests", href: "/p/prayers" },
            ],
          },
        ],
        feature: {
          tag: "This Sunday",
          title: "Join us for Mass",
          body: "Saturday 5pm vigil. Sunday 8, 10, 12, and 6pm. Daily Mass at 9am Mon–Sat.",
          ctaLabel: "Full schedule",
          ctaHref: "/mass",
        },
      },
    },
    { label: "Ministries", href: "/ministries" },
    { label: "Formation", href: "/formation" },
    { label: "Events", href: "/events" },
    { label: "Bulletin", href: "/bulletin" },
    {
      label: "About",
      href: "/p/our-team",
      mega: {
        sections: [
          {
            heading: "Our parish",
            links: [
              { label: "Our Team", href: "/p/our-team" },
              { label: "Pastoral Council", href: "/p/pastoral-council" },
              { label: "Become Catholic", href: "/p/become-catholic" },
              { label: "From Our Pastor", href: "/p/from-our-pastor" },
              { label: "Contact Us", href: "/contact" },
            ],
          },
        ],
        feature: {
          tag: "Get in touch",
          title: "We'd love to hear from you.",
          body: "Visit, call, email, or send us a note through our welcome form.",
          ctaLabel: "Contact the parish",
          ctaHref: "/contact",
        },
      },
    },
  ],
};

async function main() {
  await db
    .update(siteSettings)
    .set({ nav: NAV, updatedAt: new Date() })
    .where(eq(siteSettings.id, 1));
  console.log("✓ Nav manifest updated.");
  for (const item of NAV.items) {
    const mega = item.mega ? ` ▾ (${item.mega.sections[0]!.links.length} sub-links)` : "";
    console.log(`  ${item.label.padEnd(12)} → ${item.href}${mega}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
