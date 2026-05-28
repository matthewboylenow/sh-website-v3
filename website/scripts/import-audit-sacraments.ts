/**
 * Audit Phase 5 — seven sacrament pages.
 *
 * Creates rows in the polymorphic `pages` table at slug
 * `sacraments-<sacrament>` for each of the seven sacraments. The
 * matching public route lives at /sacraments/<sacrament>, and the
 * pages' canonicalUrl points there so search engines don't index the
 * `/p/sacraments-<sacrament>` fallback path.
 *
 * Source: legacy scrapes under content/sacraments__<slug>/page.md.
 * Copy is hand-edited per sacrament to drop the legacy footer chrome
 * (phone, mass schedule, address, ad-hoc resource links) that the
 * scraper appended to every page. What's left is the theological /
 * pastoral description plus the contact path for that sacrament.
 *
 * Hero photos come from the audit image library uploaded in Phase 1.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  pages,
  pageSections,
  type PageSectionPayload,
} from "../db/schema";

type SacramentSeed = {
  publicSlug: string;
  title: string;
  summary: string;
  photoBlobKey: string;
  blocks: PageSectionPayload[];
};

const SEEDS: SacramentSeed[] = [
  {
    publicSlug: "baptism",
    title: "Baptism at Saint Helen",
    summary:
      "Welcoming a new child of God into the Church through water, faith, and the embrace of a community.",
    photoBlobKey: "audit/baptism-hero-infant-shell-water-blessing.jpg",
    blocks: [
      {
        kind: "rich_text",
        html: `<p>Baptism celebrates a baby's entrance into the Church &mdash; becoming an adopted child of God, our Father. Our faith community and parents make a commitment to care for and teach this child as they grow in the Catholic faith.</p>`,
      },
      {
        kind: "callout_banner",
        tone: "warm",
        tag: "Get started",
        title: "Ready to schedule a Baptism?",
        body: "Call our receptionist Marielena Bula at 908-232-1214 to set up a call with our Baptism Coordinator, Tracey Sowa, to discuss baptism for your child.",
        ctaLabel: "Begin the Baptism intake form",
        ctaHref: "/baptism",
      },
    ],
  },
  {
    publicSlug: "eucharist",
    title: "The Eucharist at Saint Helen",
    summary:
      "The source and summit of our faith — Christ truly present, broken and shared.",
    photoBlobKey: "audit/eucharist-hero-priest-chalice-paten.jpg",
    blocks: [
      {
        kind: "rich_text",
        html: `<p>At every Mass, Christ feeds his Church with his own Body and Blood. The Eucharist is the source and summit of our faith and the center of Saint Helen's life as a parish.</p>`,
      },
      {
        kind: "heading",
        level: 2,
        header: { heading: "When we celebrate Mass" },
      },
      {
        kind: "rich_text",
        html: `<p><strong>Weekend</strong><br/>Saturday Vigil at 5:00 pm<br/>Sunday at 8:00 am, 10:00 am, 12:00 pm, and 6:00 pm</p><p><strong>Weekday</strong><br/>Monday through Saturday at 9:00 am</p><p>All Masses are held in the church. Holy Day Mass schedules are announced on our bulletin and social media.</p>`,
      },
      {
        kind: "button_group",
        items: [
          { label: "Full Mass schedule", href: "/mass", variant: "primary" },
          { label: "Watch the livestream", href: "/live", variant: "secondary" },
        ],
      },
    ],
  },
  {
    publicSlug: "confirmation",
    title: "Confirmation at Saint Helen",
    summary:
      "Sealed with the gifts of the Holy Spirit to live a life of faith with courage.",
    photoBlobKey: "audit/confirmation-hero-holy-spirit-stained-glass.jpg",
    blocks: [
      {
        kind: "rich_text",
        html: `<p>Confirmation deepens the grace we first received at Baptism. Through Confirmation, our personal relationship with Jesus Christ grows and we are blessed by the Holy Spirit with the seven gifts: wisdom, understanding, counsel, fortitude, knowledge, piety, and fear of the Lord.</p>`,
      },
      {
        kind: "callout_banner",
        tone: "warm",
        tag: "For teens",
        title: "Preparing for Confirmation in grades 9–10?",
        body: "Our religious education program walks students and their families through a two-year preparation. Service forms, retreat schedules, and parent resources are on the Religious Ed page.",
        ctaLabel: "Confirmation prep details",
        ctaHref: "/confirmation",
      },
    ],
  },
  {
    publicSlug: "reconciliation",
    title: "Reconciliation at Saint Helen",
    summary:
      "Encountering the mercy of Christ and being restored in his peace.",
    photoBlobKey: "audit/reconciliation-hero-priest-absolution-blessing.jpg",
    blocks: [
      {
        kind: "rich_text",
        html: `<p>The sacrament of Reconciliation brings us face-to-face with the loving mercy and grace of God. It brings healing to our pain and guidance on our journey of faith.</p>`,
      },
      {
        kind: "heading",
        level: 2,
        header: { heading: "When confessions are heard" },
      },
      {
        kind: "rich_text",
        html: `<p>Saturdays from <strong>3:30 to 4:30 pm</strong>, in the church.</p><p>Confessions are also available by appointment &mdash; call the parish office at 908-232-1214 to schedule a time with one of our priests.</p>`,
      },
    ],
  },
  {
    publicSlug: "anointing-of-the-sick",
    title: "Anointing of the Sick at Saint Helen",
    summary:
      "Christ’s healing presence through prayer and anointing in times of serious illness.",
    photoBlobKey: "audit/anointing-of-the-sick-hero-holy-oils.jpg",
    blocks: [
      {
        kind: "rich_text",
        html: `<p>Sickness of the body affects our emotional and spiritual well-being. Through the Sacrament of the Anointing of the Sick &mdash; one of the two Sacraments of Healing &mdash; Jesus Christ brings healing of spirit, mind, and body to those who are seriously ill, preparing for surgery, or near the end of life.</p>`,
      },
      {
        kind: "callout_banner",
        tone: "warm",
        tag: "Need a priest?",
        title: "Call the parish office anytime",
        body: "If you or a loved one is hospitalized, homebound, or near death, please call 908-232-1214 to arrange a visit. After hours, follow the prompts to reach the priest on call.",
        ctaLabel: "Call 908-232-1214",
        ctaHref: "tel:9082321214",
      },
    ],
  },
  {
    publicSlug: "marriage",
    title: "Marriage at Saint Helen",
    summary:
      "Two lives joined in a covenant of love that reflects the love of Christ for his Church.",
    photoBlobKey: "audit/marriage-hero-couple-rings-bouquet.jpg",
    blocks: [
      {
        kind: "rich_text",
        html: `<p>The Vocation of Marriage is the divine call to show the love of God for the world through the love of husband and wife for each other. Bride and groom give themselves to one another in covenant, and that mutual gift becomes a sign of Christ&rsquo;s love for the Church.</p>`,
      },
      {
        kind: "callout_banner",
        tone: "gold",
        tag: "Engaged?",
        title: "Start with Pre-Cana, then book with our Wedding Ministry.",
        body: "Couples planning a Catholic wedding at Saint Helen begin with Pre-Cana preparation, then work with our Wedding Ministers who handle the rehearsal and day-of logistics.",
        ctaLabel: "Pre-Cana preparation",
        ctaHref: "/p/pre-cana",
      },
      {
        kind: "button_group",
        items: [
          {
            label: "Meet the Wedding Ministry",
            href: "/ministries/wedding-ministry",
            variant: "primary",
          },
        ],
      },
    ],
  },
  {
    publicSlug: "holy-orders",
    title: "Holy Orders at Saint Helen",
    summary:
      "Men set apart to serve the Church as bishops, priests, and deacons.",
    photoBlobKey: "audit/holy-orders-hero-seminarians-vestments.jpg",
    blocks: [
      {
        kind: "rich_text",
        html: `<p>The Catholic Church is blessed by the service of countless dedicated priests, deacons, and bishops. The Sacrament of Holy Orders celebrates the ordination of men to these roles &mdash; each a distinct way of serving God&rsquo;s people.</p>`,
      },
      {
        kind: "callout_banner",
        tone: "navy",
        tag: "Discerning a call?",
        title: "Talk with one of our priests.",
        body: "If you sense God may be calling you to the priesthood or diaconate, please reach out. Our pastoral team is happy to walk and pray with you through the discernment process.",
        ctaLabel: "Contact the parish office",
        ctaHref: "tel:9082321214",
      },
    ],
  },
];

async function main() {
  for (const seed of SEEDS) {
    const slug = `sacraments-${seed.publicSlug}`;
    const canonicalUrl = `/sacraments/${seed.publicSlug}`;
    const [row] = await db
      .insert(pages)
      .values({
        slug,
        title: seed.title,
        summary: seed.summary,
        photoBlobKey: seed.photoBlobKey,
        status: "published",
        canonicalUrl,
      })
      .onConflictDoUpdate({
        target: pages.slug,
        set: {
          title: seed.title,
          summary: seed.summary,
          photoBlobKey: seed.photoBlobKey,
          canonicalUrl,
          updatedAt: new Date(),
        },
      })
      .returning({ id: pages.id });
    if (!row) throw new Error(`insert returned no row for ${slug}`);

    await db
      .delete(pageSections)
      .where(and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, row.id)));
    await db.insert(pageSections).values(
      seed.blocks.map((b, i) => ({
        parentKind: "page" as const,
        parentId: row.id,
        position: i,
        kind: b.kind,
        payload: b,
      })),
    );
    console.log(`  ✓ /sacraments/${seed.publicSlug.padEnd(22)} ${seed.blocks.length} blocks`);
  }
  console.log(`\n✓ Imported ${SEEDS.length} sacrament pages.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
