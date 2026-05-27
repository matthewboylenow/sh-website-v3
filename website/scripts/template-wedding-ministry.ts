/**
 * Reference template — Wedding Ministry built manually using the full
 * block vocabulary to define what "new modern site look" means for
 * ministry detail pages. Once approved, this same pattern drives the
 * smarter automated pass in scripts/improve-ministry-sections.ts.
 *
 * Page narrative (top-down):
 *   • Hero (template-rendered) — name, tagline, hero photo
 *   • Mission image_text  — paragraph + warm photo, gives the WHY
 *   • Heading "How a Saint Helen Wedding Works"
 *   • Rich_text — the day-of / rehearsal logistics paragraph
 *   • Heading "Meet the Coordinators"
 *   • Card_grid — two coordinator cards w/ email links
 *   • Callout_banner — gentle nudge toward Pre-Cana, gold tone, with CTA
 *   • (Existing "Get involved" inquiry form renders below)
 */

import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  ministries,
  pageSections,
  type PageSectionPayload,
} from "../db/schema";

async function main() {
  const [m] = await db
    .select()
    .from(ministries)
    .where(eq(ministries.slug, "wedding-ministry"))
    .limit(1);
  if (!m) throw new Error("wedding-ministry not found");

  // ---- 1. Sharpen the tagline (used by the page hero + cards) ---- //
  const tagline = "Helping couples celebrate the sacrament of marriage with reverence and joy.";
  await db
    .update(ministries)
    .set({ tagline, updatedAt: new Date() })
    .where(eq(ministries.id, m.id));

  // ---- 2. Replace blocks --------------------------------------- //
  await db
    .delete(pageSections)
    .where(and(eq(pageSections.parentKind, "ministry"), eq(pageSections.parentId, m.id)));

  const blocks: PageSectionPayload[] = [
    // Mission — image-right pairing
    {
      kind: "image_text",
      blobKey: "audit/marriage-hero-couple-rings-bouquet.jpg",
      alt: "Wedding rings resting on a bridal bouquet of peach roses",
      imageSide: "right",
      html: `<p>The Wedding Ministry at Saint Helen is dedicated to walking with engaged couples as they prepare for their wedding ceremony — and to celebrating that sacred moment alongside their families, wedding parties, and guests.</p><p>Our aim, simply put, is that every couple experiences a wedding that is <strong>reverent, well-organized, and joy-filled</strong>.</p>`,
    },

    // Section heading
    {
      kind: "heading",
      level: 2,
      header: { heading: "How a Saint Helen wedding works" },
    },

    // Day-of logistics
    {
      kind: "rich_text",
      html: `<p>One or two Wedding Ministers are assigned to every wedding. They lead the rehearsal — walking through every logistical detail in advance — and they're back on the wedding day itself, making sure the ceremony unfolds exactly as planned and that the couple, families, wedding party, and guests have everything they need.</p>`,
    },

    // Coordinator cards
    {
      kind: "heading",
      level: 2,
      header: { heading: "Meet the coordinators" },
    },
    {
      kind: "card_grid",
      layout: "uniform",
      columns: 2,
      cardStyle: "stacked",
      cards: [
        {
          title: "Denise Revello",
          summary: "Email deniserevello@gmail.com or call 917-825-4716.",
          href: "mailto:deniserevello@gmail.com",
          ctaLabel: "Email Denise",
        },
        {
          title: "Maribeth Vaszily",
          summary: "Email maribethvaszily@gmail.com or call 908-868-8353.",
          href: "mailto:maribethvaszily@gmail.com",
          ctaLabel: "Email Maribeth",
        },
      ],
    },

    // Pre-Cana nudge
    {
      kind: "callout_banner",
      tone: "gold",
      tag: "Next step",
      title: "Engaged? Pre-Cana comes first.",
      body: "All Catholic weddings at Saint Helen begin with Pre-Cana — a warm, conversational preparation experience led by parishioner couples. Plan ahead so the dates line up with your wedding.",
      ctaLabel: "Learn about Pre-Cana",
      ctaHref: "/p/pre-cana",
      imageBlobKey: "audit/pre-cana-hero-bride-groom-hillside.jpg",
    },
  ];

  await db.insert(pageSections).values(
    blocks.map((b, i) => ({
      parentKind: "ministry" as const,
      parentId: m.id,
      position: i,
      kind: b.kind,
      payload: b,
    })),
  );

  console.log(`✓ Wedding Ministry rebuilt with ${blocks.length} blocks`);
  for (const b of blocks) {
    console.log(`  ${b.kind}${"header" in b && b.header?.heading ? `  "${b.header.heading}"` : ""}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
