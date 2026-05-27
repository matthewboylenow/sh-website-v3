/**
 * Reference template — Mental Health Ministry built manually using the
 * full block vocabulary. Companion to template-wedding-ministry.ts;
 * together they anchor the "new modern site look" for ministry pages.
 *
 * The legacy scrape for this page was a 15k-char wall of text including
 * a mission paragraph, a mission statement, an embedded broken link
 * containing the entire body URL-encoded as its href, sections on the
 * Green Ribbon and Mary Magdalene's patronage, a long Sanctuary Course
 * description, eight bereavement groups, two link bundles (general
 * resources + substance-use resources), and the legacy site's
 * "You Might Also Be Interested In" footer. This template breaks all
 * of that into properly-shaped blocks and drops the chrome.
 *
 * Narrative top-down:
 *   • Hero (template-rendered) — name, tagline, hero photo
 *   • Mission image_text  — left image (helping hands), mission body
 *   • Callout_banner       — mission statement, warm tone
 *   • Heading "The green ribbon"
 *   • image_text (right)   — ribbon symbolism
 *   • Heading "Our patron saint"
 *   • Rich_text            — Mary Magdalene
 *   • Heading "Sanctuary Course"
 *   • Rich_text            — Sanctuary Course detail
 *   • Heading "Bereavement groups in our community"
 *   • Card_grid            — 8 cards, one per partnered group
 *   • Heading "Resources"
 *   • Link_list            — mental-health resources
 *   • Heading "Substance use resources"
 *   • Link_list            — recovery resources
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
    .where(eq(ministries.slug, "mental-health-ministry"))
    .limit(1);
  if (!m) throw new Error("mental-health-ministry not found");

  // ---- 1. Sharpen the tagline ---------------------------------- //
  const tagline = "Walking with parishioners through mental health challenges with confidentiality, care, and a Catholic perspective.";
  await db
    .update(ministries)
    .set({ tagline, updatedAt: new Date() })
    .where(eq(ministries.id, m.id));

  // ---- 2. Replace blocks --------------------------------------- //
  await db
    .delete(pageSections)
    .where(and(eq(pageSections.parentKind, "ministry"), eq(pageSections.parentId, m.id)));

  const blocks: PageSectionPayload[] = [
    // Mission — image-left pairing
    {
      kind: "image_text",
      blobKey: "audit/support-outreach-section-bg-helping-hands.jpg",
      alt: "Two people clasping hands in a gesture of support",
      imageSide: "left",
      html: `<p>The Mental Health Ministry uses theological, psychological, and social perspectives to equip the Church to support mental health and well-being. We raise mental health awareness within our faith community and provide theologically sound educational resources and training to promote mental wellness.</p><p>For more information, contact <strong>Liz Migneco</strong> at <a href="mailto:lmigneco@sainthelen.org">lmigneco@sainthelen.org</a>.</p>`,
    },

    // Mission statement as a warm callout
    {
      kind: "callout_banner",
      tone: "warm",
      tag: "Our mission",
      title: "We are here to walk with others who are struggling with mental health in a confidential manner while using a Catholic perspective.",
    },

    // The Green Ribbon
    {
      kind: "heading",
      level: 2,
      header: { heading: "The green ribbon" },
    },
    {
      kind: "image_text",
      blobKey: "audit/mental-health-awareness-green-ribbons-2.jpg",
      alt: "Multiple hands cradling green awareness ribbons on a green background",
      imageSide: "right",
      html: `<p>The green ribbon is a symbol of mental health awareness — representing refreshment, peace, and renewal. Just as green in nature signifies growth and life, it reminds us of the new beginnings we seek for those struggling with mental health.</p><p>By wearing or displaying the green ribbon, we help break the silence and stigma around mental health. Together, we can raise awareness and foster a fresh start for many in our community.</p>`,
    },

    // Patron Saint
    {
      kind: "heading",
      level: 2,
      header: { heading: "Our patron saint" },
    },
    {
      kind: "rich_text",
      html: `<p><strong>Mary Magdalene</strong> was chosen as the patron saint of our Mental Health Ministry because of her journey of healing and transformation. Often misunderstood and stigmatized, she found strength in her encounter with Jesus, who saw her not for her past, but for her potential.</p><p>Her story resonates with the core mission of our ministry — to provide support, hope, and healing to those who may feel marginalized or weighed down by mental health struggles. Mary Magdalene's resilience and faith inspire us to walk with compassion alongside those on their own path to wholeness.</p>`,
    },

    // Sanctuary Course
    {
      kind: "heading",
      level: 2,
      header: { heading: "The Sanctuary Course" },
    },
    {
      kind: "rich_text",
      html: `<p>One in four people will be affected by a mental health problem at some point in their lives, yet the stigma surrounding mental health silences many and prevents faith communities from responding compassionately and effectively.</p><p>This eight-session course — designed for small groups — explores the realities of mental health and illness, and the vital need for faith-based community conversations on these topics. Sessions are accompanied by films featuring the stories of Catholics living with mental health challenges, alongside insights from archbishops, theologians, and psychologists.</p><p>The coursebook defines key terms, presents relevant research, and explores important concepts from three perspectives: the psychological, the social, and the theological. The films elevate the voice of lived experience; mental health professionals, theologians, and church leaders contribute biblical integration and ideas for community support.</p><p>For more information about the Sanctuary Course, please contact <a href="mailto:lmigneco@sainthelen.org">Liz Migneco</a>.</p>`,
    },

    // Bereavement groups card grid
    {
      kind: "heading",
      level: 2,
      header: { heading: "Bereavement groups in our community" },
    },
    {
      kind: "card_grid",
      layout: "uniform",
      columns: 2,
      cardStyle: "stacked",
      cards: [
        {
          title: "Journey Through Bereavement",
          summary: "Support group at Church of the Little Flower in Berkeley Heights.",
          href: "http://littleflowerbh.org",
          ctaLabel: "Visit littleflowerbh.org",
        },
        {
          title: "Eternal Bonds",
          summary: "For those grieving the loss of a child. Church of the Little Flower, Berkeley Heights. Call Dan Grossano at 908-464-1585.",
          href: "mailto:eternalbonds.lf@gmail.com",
          ctaLabel: "Email organizers",
        },
        {
          title: "Postpartum Mamas Support Group",
          summary: "Third Thursday of every month, 12:00–1:00 pm. Westfield Memorial Library.",
          href: "https://hopehealinghappinesscounseling.com",
          ctaLabel: "Learn more",
        },
        {
          title: "Seasons of Hope",
          summary: "Bereavement support group at St. James in Springfield.",
          href: "https://sainthelen.org/wp-content/uploads/2025/04/St_James_bereivement_group.pdf",
          ctaLabel: "Download flyer",
        },
        {
          title: "Bereavement Group at St. John the Apostle",
          summary: "Support group at St. John the Apostle in Clark. Contact Deacon Mike at 732-288-1253.",
          href: "mailto:myork@sjanj.net",
          ctaLabel: "Email Deacon Mike",
        },
        {
          title: "Bereavement Ministry of Holy Spirit Church",
          summary: "Eight Thursdays from March 5, 2026 at 7:00–8:00 pm.",
          href: "https://sainthelen.org/wp-content/uploads/2026/01/Spring2026HolySpiritUnionSupport_3-5-2026-1-scaled.jpg",
          ctaLabel: "Download flyer",
        },
        {
          title: "Bereavement Ministry at Our Lady of Sorrows",
          summary: "South Orange, starting Sunday, January 18, 2026 from 1:00–2:30 pm.",
          href: "https://sainthelen.org/wp-content/uploads/2026/01/southorange_our_lady_of_sorrows_1-18-2026-scaled.jpg",
          ctaLabel: "Download flyer",
        },
        {
          title: "H.O.P.E. Bereaved Parents Support Group",
          summary: "An Archdiocesan program for bereaved parents — meets monthly at multiple parishes.",
          href: "https://sainthelen.org/wp-content/uploads/2026/01/H.O.P.E_Bereaved_Parents_Support_Groups_monthly_2026-scaled.jpg",
          ctaLabel: "View schedule",
        },
      ],
    },

    // Mental-health resources
    {
      kind: "heading",
      level: 2,
      header: { heading: "Resources" },
    },
    {
      kind: "link_list",
      items: [
        { label: "Child Abuse Prevention Resources", href: "https://sainthelen.org/wp-content/uploads/2024/04/National-Child-Abuse-Prevention-Month.pdf", iconHint: "pdf" },
        { label: "2025–26 Union County Mental Health / Addiction Resources", href: "https://sainthelen.org/wp-content/uploads/2025/03/1742483067558-2025_Union_County_Directory_Rev.pdf", iconHint: "pdf" },
        { label: "Union County Department of Human Services Resource Guide", href: "https://sainthelen.org/wp-content/uploads/2024/08/FINAL-English-2024-UCDHS-Resource-Guide.pdf", iconHint: "pdf" },
        { label: "Union County Older Adults Resource Directory", href: "https://sainthelen.org/wp-content/uploads/2024/11/older-adultsResource-Directory_2.24-1.pdf", iconHint: "pdf" },
        { label: "NAMI National", href: "https://nami.org", iconHint: "external" },
        { label: "NAMI New Jersey", href: "https://naminj.org", iconHint: "external" },
        { label: "NAMI Union County", href: "https://namiunioncountynj.org", iconHint: "external" },
        { label: "Mental Health Association of NJ", href: "https://www.mhanj.org", iconHint: "external" },
        { label: "My Resource Pal — food, housing, transportation", href: "https://myresourcepal.org/", iconHint: "external" },
        { label: "NAMI Family-To-Family Course flyer", href: "https://sainthelen.org/wp-content/uploads/2025/08/NAMI_revised_Oct_F2F_jpeg_7-14-2025-scaled.jpg", iconHint: "external" },
        { label: "NJ Human Services Resources", href: "https://sainthelen.org/wp-content/uploads/2025/08/NJ_Resources_2024_First_Edition.pdf", iconHint: "pdf" },
        { label: "NAMI Family Support Group for School-Aged Parents & Caregivers", href: "https://sainthelen.org/wp-content/uploads/2025/09/NAMIFSGflyer.pdf", iconHint: "pdf" },
        { label: "Building Foundations of Caregiving", href: "https://sainthelen.org/wp-content/uploads/2026/03/Building_the_Foundations_of_Caregiving_-_3.30.2026_at_Little_Flower.pdf", iconHint: "pdf" },
      ],
    },

    // Substance use resources
    {
      kind: "heading",
      level: 2,
      header: { heading: "Substance use resources" },
    },
    {
      kind: "link_list",
      items: [
        { label: "Alcoholics Anonymous", href: "https://aa.org", iconHint: "external" },
        { label: "Al-Anon", href: "https://al-anon.org", iconHint: "external" },
        { label: "Narcotics Anonymous", href: "https://na.org/", iconHint: "external" },
        { label: "Twelve — addiction support group", href: "https://sainthelen.org/wp-content/uploads/2025/11/doc05105020251029121836.pdf", iconHint: "pdf" },
        { label: "NJ Reentry — Archdiocesan program", href: "https://sainthelen.org/wp-content/uploads/2025/11/NJ_Reentry_Archdiocease.pdf", iconHint: "pdf" },
      ],
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

  console.log(`✓ Mental Health Ministry rebuilt with ${blocks.length} blocks`);
  for (const b of blocks) {
    const label = "header" in b && b.header?.heading ? `  "${b.header.heading}"` : "";
    console.log(`  ${b.kind}${label}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
