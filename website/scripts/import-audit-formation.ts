/**
 * Audit Phase 6 — Faith Formation programs (5 pages).
 *
 * Seeds the formation_pages table with the religious-ed programs from
 * the legacy site scrape. Each row gets a hero photo, summary, and a
 * curated set of page_sections (parentKind=formation) that drop the
 * legacy footer chrome and focus on what families actually need:
 * program description, age band, director contact, and links to the
 * registration / service forms.
 *
 * All 5 land status=published since the curriculum overviews are
 * evergreen. Year-specific schedules and PDFs are encoded inline so
 * the parish staff can edit them in admin year-over-year.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  formationPages,
  pageSections,
  type FormationCategory,
  type PageSectionPayload,
} from "../db/schema";

type FormationSeed = {
  slug: string;
  name: string;
  summary: string;
  category: FormationCategory;
  audiences: string[];
  contactEmail: string | null;
  photoBlobKey: string;
  orderingPriority: number;
  blocks: PageSectionPayload[];
};

const SEEDS: FormationSeed[] = [
  {
    slug: "kids-corner",
    name: "Kids Corner (Ages 2–5)",
    summary:
      "Worship designed for our youngest children — sacred stories, songs, and a warm welcome at the 10:00 am Sunday Mass.",
    category: "kids",
    audiences: ["families", "kids"],
    contactEmail: "tsowa@sainthelen.org",
    photoBlobKey: "audit/kids-corner-section-bg-children-crucifix-lesson.jpg",
    orderingPriority: 10,
    blocks: [
      {
        kind: "rich_text",
        html: `<p>Kids Corner is developmentally appropriate worship designed for our young children during the 10:00 am Sunday Mass. While parents attend Mass, Kids Corner gives little ones a sacred space of their own — songs, stories, and prayer with familiar adult faces every week.</p>`,
      },
      {
        kind: "heading",
        level: 2,
        header: { heading: "Register for Kids Corner" },
      },
      {
        kind: "rich_text",
        html: `<p>Tracey Sowa coordinates Kids Corner. Reach her at <a href="mailto:tsowa@sainthelen.org">tsowa@sainthelen.org</a> or 908-232-1214 x110 with questions or to register your child.</p>`,
      },
    ],
  },
  {
    slug: "children",
    name: "Children (Grades 1–4)",
    summary:
      "Faith Formation for children in grades 1 through 4 — sacramental preparation, weekly programs, and a community of fellow families.",
    category: "kids",
    audiences: ["kids", "families"],
    contactEmail: "nmurphy@sainthelen.org",
    photoBlobKey: "audit/religious-education-section-bg-child-reading-bible.jpg",
    orderingPriority: 20,
    blocks: [
      {
        kind: "image_text",
        blobKey: "audit/year-1-beginnings-religious-education.jpg",
        alt: "Year 1 Beginnings religious education graphic",
        imageSide: "right",
        html: `<p><strong>Year 1: Beginnings</strong> &mdash; the start of your child's formal faith formation and a lifetime of learning about Jesus Christ. Designed for first or second graders in their first year of Faith Formation, this year is the foundation for First Reconciliation and First Communion preparation.</p><p>Sessions are faith-filled, engaging, and fun — Bible stories, music, prayer, and the rhythms of the Mass and liturgical calendar.</p>`,
      },
      {
        kind: "heading",
        level: 2,
        header: { heading: "Grade-level programs" },
      },
      {
        kind: "card_grid",
        layout: "uniform",
        columns: 3,
        cardStyle: "stacked",
        cards: [
          {
            title: "Year 1: Beginnings",
            summary:
              "First/second grade — laying the foundation for First Reconciliation and First Communion.",
          },
          {
            title: "Year 2: Blessed",
            summary:
              "Continues sacramental preparation; children celebrate First Reconciliation and First Communion.",
          },
          {
            title: "Grades 3 & 4",
            summary:
              "Deepens the faith story, with monthly in-person sessions and at-home parent-child lessons.",
          },
        ],
      },
      {
        kind: "heading",
        level: 2,
        header: { heading: "Director of Religious Education" },
      },
      {
        kind: "rich_text",
        html: `<p><strong>Nicole Murphy</strong>, Director of Religious Education for Grades 1–4.<br/>Email <a href="mailto:nmurphy@sainthelen.org">nmurphy@sainthelen.org</a> or call 908-232-1214 x116.</p>`,
      },
      {
        kind: "callout_banner",
        tone: "warm",
        tag: "Volunteer",
        title: "Help shape the next generation of disciples.",
        body: "Our Religious Ed Ministers — teachers and check-in volunteers — are vital. All ministers complete Protecting God's Children training and a background check. We'll walk you through the process.",
        ctaLabel: "About Protecting God's Children",
        ctaHref: "/formation/empowering-gods-children",
      },
    ],
  },
  {
    slug: "middle-school",
    name: "Middle School (Grades 5–8)",
    summary:
      "Faith Formation for grades 5–8 — large-group sessions, EDGE afternoons, GAIM-time Masses, retreats, and Spotlight Lessons.",
    category: "youth",
    audiences: ["youth", "families"],
    contactEmail: "mfusco@sainthelen.org",
    photoBlobKey: "audit/middle-school-section-bg-hands-together.jpg",
    orderingPriority: 30,
    blocks: [
      {
        kind: "rich_text",
        html: `<p>Our Middle School Religious Ed program offers innovative, age-appropriate ways for students in grades 5 through 8 to experience their faith.</p><p>The year includes Large Group Sessions, EDGE Afternoons, GAIM-time Masses, Spotlight Lessons (on YouTube), and a Retreat Day. Large Group sessions run on three different days each week to fit busy family schedules.</p>`,
      },
      {
        kind: "heading",
        level: 2,
        header: { heading: "Director of Religious Education" },
      },
      {
        kind: "rich_text",
        html: `<p><strong>Mike Fusco</strong>, Director of Religious Education for Grades 5–10.<br/>Email <a href="mailto:mfusco@sainthelen.org">mfusco@sainthelen.org</a>.</p>`,
      },
      {
        kind: "link_list",
        header: { heading: "Forms and resources" },
        items: [
          {
            label: "Service Form (all grades)",
            href: "https://sainthelen.org/wp-content/uploads/2021/02/Service-Form-All-grades.docx",
            iconHint: "pdf",
          },
          {
            label: "Spotlight Lessons on YouTube",
            href: "https://www.youtube.com/playlist?list=PL3649Z9YPegSgbPCGhQ_GIybEayo0Gk-v",
            iconHint: "video",
          },
        ],
      },
    ],
  },
  {
    slug: "confirmation",
    name: "Confirmation (Grades 9–10)",
    summary:
      "A two-year preparation for the Sacrament of Confirmation — service, retreats, and growing in the gifts of the Holy Spirit.",
    category: "youth",
    audiences: ["youth", "families"],
    contactEmail: "mfusco@sainthelen.org",
    photoBlobKey: "audit/confirmation-hero-holy-spirit-stained-glass.jpg",
    orderingPriority: 40,
    blocks: [
      {
        kind: "rich_text",
        html: `<p>Saint Helen's Confirmation program walks students in grades 9 and 10 through a two-year preparation for the Sacrament of Confirmation. Students grow in personal relationship with Jesus, serve their community, attend retreats, and journey alongside sponsors and peers.</p>`,
      },
      {
        kind: "heading",
        level: 2,
        header: { heading: "Director of Religious Education" },
      },
      {
        kind: "rich_text",
        html: `<p><strong>Mike Fusco</strong>, Director of Religious Education for Grades 5–10.<br/>Email <a href="mailto:mfusco@sainthelen.org">mfusco@sainthelen.org</a>.</p>`,
      },
      {
        kind: "button_group",
        items: [
          {
            label: "Read about the Sacrament of Confirmation",
            href: "/sacraments/confirmation",
            variant: "primary",
          },
        ],
      },
    ],
  },
  {
    slug: "empowering-gods-children",
    name: "Empowering God's Children",
    summary:
      "An age-appropriate program that gives children and youth tools to protect themselves and know what to do if they encounter abuse.",
    category: "families",
    audiences: ["kids", "youth", "families"],
    contactEmail: null,
    photoBlobKey: "audit/empowering-children-bg-kids-rain-boots.jpg",
    orderingPriority: 50,
    blocks: [
      {
        kind: "rich_text",
        html: `<p>Empowering God's Children is an age-appropriate, comprehensive program that gives catechists, teachers, youth ministers, and parents the tools to teach children and youth how to protect themselves and what to do if they encounter abuse.</p><p>The program is part of the Archdiocese's broader Protecting God's Children initiative. All Saint Helen volunteers who work with minors complete this training along with a criminal background check.</p>`,
      },
      {
        kind: "callout_banner",
        tone: "navy",
        tag: "Volunteer step",
        title: "Working with our children or youth?",
        body: "All Saint Helen volunteer ministers complete Protecting God's Children training and a background check before working with minors. The parish office walks you through every step.",
        ctaLabel: "Contact the parish office",
        ctaHref: "tel:9082321214",
      },
      {
        kind: "link_list",
        header: { heading: "Related resources" },
        items: [
          {
            label: "Protecting God's Children — Virtus Online",
            href: "https://virtusonline.org/virtus/",
            iconHint: "external",
          },
          {
            label: "Saint Helen Protecting God's Children",
            href: "/p/pgc",
            iconHint: "external",
          },
        ],
      },
    ],
  },
];

async function main() {
  for (const seed of SEEDS) {
    const [row] = await db
      .insert(formationPages)
      .values({
        slug: seed.slug,
        name: seed.name,
        summary: seed.summary,
        category: seed.category,
        audiences: seed.audiences,
        contactEmail: seed.contactEmail,
        photoBlobKey: seed.photoBlobKey,
        orderingPriority: seed.orderingPriority,
        status: "published",
      })
      .onConflictDoUpdate({
        target: formationPages.slug,
        set: {
          name: seed.name,
          summary: seed.summary,
          category: seed.category,
          audiences: seed.audiences,
          contactEmail: seed.contactEmail,
          photoBlobKey: seed.photoBlobKey,
          orderingPriority: seed.orderingPriority,
          updatedAt: new Date(),
        },
      })
      .returning({ id: formationPages.id });
    if (!row) throw new Error(`Insert returned no row for ${seed.slug}`);

    await db
      .delete(pageSections)
      .where(
        and(
          eq(pageSections.parentKind, "formation"),
          eq(pageSections.parentId, row.id),
        ),
      );
    await db.insert(pageSections).values(
      seed.blocks.map((b, i) => ({
        parentKind: "formation" as const,
        parentId: row.id,
        position: i,
        kind: b.kind,
        payload: b,
      })),
    );
    console.log(`  ✓ /formation/${seed.slug.padEnd(28)} ${seed.blocks.length} blocks`);
  }
  console.log(`\n✓ Imported ${SEEDS.length} formation pages.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
