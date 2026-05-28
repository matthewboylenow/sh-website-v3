/**
 * Audit Phase 7 — Staff seed from /our-team.
 *
 * Upserts the 17 real Saint Helen staff members from the legacy /our-team
 * scrape. Each row gets the audit-library headshot (uploaded in Phase 1)
 * keyed at `audit/team-headshot-<slug>.jpg`.
 *
 * Emails are left null — the legacy site uses CloudFlare's email-protection
 * obfuscation which we'd have to decode per-staff. The parish team can
 * fill emails in via /admin/staff or we can add them in a follow-up pass.
 *
 * Upsert behavior: keyed on slug. Existing rows (the four dev-fixture
 * placeholders like fr-tom, fr-luis) are left alone — only the 17 real
 * staff members below are inserted/updated.
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { staff } from "../db/schema";

type StaffSeed = {
  slug: string;
  name: string;
  role: string;
  photoBlobKey: string;
  orderingPriority: number;
};

const SEEDS: StaffSeed[] = [
  // Clergy
  {
    slug: "msgr-thomas-nydegger",
    name: "Rev. Msgr. Thomas Nydegger",
    role: "Pastor",
    photoBlobKey: "", // not in audit library — placeholder until upload
    orderingPriority: 10,
  },

  // Pastoral / leadership
  {
    slug: "adrian-soltys",
    name: "Adrian Soltys",
    role: "Director of Worship",
    photoBlobKey: "audit/team-headshot-adrian-soltys.jpeg",
    orderingPriority: 20,
  },
  {
    slug: "chris-steiner",
    name: "Chris Steiner",
    role: "Operations Director",
    photoBlobKey: "audit/team-headshot-chris-steiner.jpg",
    orderingPriority: 30,
  },
  {
    slug: "kent-diamond",
    name: "Kent Diamond",
    role: "Business Manager",
    photoBlobKey: "audit/team-headshot-kent-diamond.jpg",
    orderingPriority: 40,
  },
  {
    slug: "maria-auricchio",
    name: "Maria Auricchio",
    role: "Coordinator of Adult Discipleship",
    photoBlobKey: "audit/team-headshot-maria-auricchio.jpg",
    orderingPriority: 50,
  },
  {
    slug: "marilyn-ryan",
    name: "Marilyn Ryan",
    role: "Pastoral Associate",
    photoBlobKey: "audit/team-headshot-marilyn-ryan.jpg",
    orderingPriority: 60,
  },
  {
    slug: "matthew-boyle",
    name: "Matthew Boyle",
    role: "Director of Communications",
    photoBlobKey: "audit/matthew-boyle-team-headshot.jpg",
    orderingPriority: 70,
  },

  // Religious education
  {
    slug: "michael-fusco",
    name: "Michael Fusco",
    role: "Director of Religious Education (Gr 5–10)",
    photoBlobKey: "audit/team-headshot-michael-fusco.jpg",
    orderingPriority: 80,
  },
  {
    slug: "nicole-murphy",
    name: "Nicole Murphy",
    role: "Director of Religious Education (Gr 1–4)",
    photoBlobKey: "audit/team-headshot-nicole-murphy.jpg",
    orderingPriority: 90,
  },
  {
    slug: "patti-gardner",
    name: "Patti Gardner",
    role: "Director of Youth Ministry (Gr 9–12)",
    photoBlobKey: "audit/team-headshot-patti-gardner.jpg",
    orderingPriority: 100,
  },
  {
    slug: "tracey-sowa",
    name: "Tracey Sowa",
    role: "Baptism and Kids Corner Ministries Coordinator",
    photoBlobKey: "audit/team-headshot-tracey-sowa.jpg",
    orderingPriority: 110,
  },

  // Support / admin
  {
    slug: "liz-migneco",
    name: "Liz Migneco",
    role: "Director of Counseling",
    photoBlobKey: "audit/team-headshot-liz-migneco.jpg",
    orderingPriority: 120,
  },
  {
    slug: "marielena-bula",
    name: "Marielena Bula",
    role: "Administrative Assistant",
    photoBlobKey: "audit/team-headshot-marielena-bula.jpg",
    orderingPriority: 130,
  },
  {
    slug: "marielle-brown",
    name: "Marielle Brown",
    role: "Assistant to the Pastor",
    photoBlobKey: "audit/team-headshot-marielle-brown.jpg",
    orderingPriority: 140,
  },
  {
    slug: "maryann-gerbino",
    name: "MaryAnn Gerbino",
    role: "Religious Education Grades 1–4 Assistant",
    photoBlobKey: "audit/team-headshot-maryann-gerbino.jpg",
    orderingPriority: 150,
  },
  {
    slug: "megan-ebner",
    name: "Megan Ebner",
    role: "ECHO Apprentice",
    photoBlobKey: "audit/team-headshot-megan-ebner.jpg",
    orderingPriority: 160,
  },
  {
    slug: "jon-chironna",
    name: "Jon Chironna",
    role: "Custodian",
    photoBlobKey: "audit/team-headshot-jon-chironna.jpg",
    orderingPriority: 170,
  },
];

async function main() {
  for (const seed of SEEDS) {
    const photoKey = seed.photoBlobKey || null;
    await db
      .insert(staff)
      .values({
        slug: seed.slug,
        name: seed.name,
        role: seed.role,
        photoBlobKey: photoKey,
        orderingPriority: seed.orderingPriority,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: staff.slug,
        set: {
          name: seed.name,
          role: seed.role,
          photoBlobKey: photoKey,
          orderingPriority: seed.orderingPriority,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    console.log(`  ✓ ${seed.slug.padEnd(28)} ${photoKey ? "📷" : "  "} ${seed.role}`);
  }

  // Archive the four old placeholder staff (fr-tom / fr-luis / maria-chen / paul-rivera)
  // that were seeded for development. These names aren't real and shouldn't
  // surface on the public Our Team page.
  const placeholders = ["fr-tom", "fr-luis", "maria-chen", "paul-rivera"];
  for (const slug of placeholders) {
    const r = await db
      .update(staff)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(staff.slug, slug))
      .returning({ id: staff.id });
    if (r.length > 0) console.log(`  ~ archived placeholder: ${slug}`);
  }
  console.log(`\n✓ Imported ${SEEDS.length} real staff members.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
