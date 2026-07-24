/**
 * Full punch-list audit — checks every staff-requested text change
 * against the LIVE DB content using whitespace/markup-tolerant
 * matching (strips tags, decodes entities, collapses newlines), so
 * partial applications like the Art & Environment <em> miss get caught.
 *
 * RUN: pnpm tsx --env-file=.env.local scripts/_audit-punchlist.ts
 */
import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { ministries, pageSections } from "../db/schema";

function loose(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&(rsquo|#8217|apos|#39|lsquo|#8216);/g, "'")
    .replace(/&(rdquo|ldquo|#822[01]);/g, '"')
    .replace(/&(ndash|#8211|mdash|#8212);/g, "-")
    .replace(/&nbsp;/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** phrase → must be ABSENT (gone) or PRESENT on the given slug. */
type Check = { slug: string; phrase: string; expect: "gone" | "present" };

const CHECKS: Check[] = [
  // --- Art & Environment
  { slug: "art-environment-ministry", phrase: "the purpose of the art and environment ministry", expect: "gone" },
  { slug: "art-environment-ministry", phrase: "our is made up of", expect: "gone" },
  { slug: "art-environment-ministry", phrase: "our design guild is made up of", expect: "present" },
  // --- Baptism
  { slug: "baptism-ministry", phrase: "community---and", expect: "gone" },
  { slug: "baptism-ministry", phrase: "why it matters", expect: "present" },
  // --- Ageless
  { slug: "ageless", phrase: "the goal of ageless", expect: "gone" },
  { slug: "ageless", phrase: "check out lifelines for more ways", expect: "gone" },
  { slug: "ageless", phrase: "more about ageless at saint helen", expect: "gone" },
  { slug: "ageless", phrase: "questions about ageless", expect: "gone" },
  { slug: "ageless", phrase: "ageless is a community of active", expect: "present" },
  // --- Altar Servers
  { slug: "altar-servers", phrase: "contact adrian soltys", expect: "gone" },
  // --- Care
  { slug: "care-ministry", phrase: "908-232-1214 x 113", expect: "present" },
  { slug: "care-ministry", phrase: "mryan@sainthelen.org", expect: "present" },
  { slug: "care-ministry", phrase: "(908)232-1214", expect: "gone" },
  // --- Caregivers
  { slug: "caregivers-support", phrase: "parish library", expect: "gone" },
  { slug: "caregivers-support", phrase: "7:30 pm in the parish center", expect: "present" },
  { slug: "caregivers-support", phrase: "contact cathy colon", expect: "gone" },
  // --- CFC
  { slug: "catholic-families-connect", phrase: "questions about catholic families connect", expect: "gone" },
  // --- CLOW
  { slug: "childrens-liturgy-of-the-word", phrase: "please consider volunteering in this wonderful ministry", expect: "gone" },
  { slug: "childrens-liturgy-of-the-word", phrase: "description & calendar button below for more detailed information", expect: "present" },
  // --- 4Cs
  { slug: "4cs", phrase: "hackensack meridian health in neptune", expect: "present" },
  // --- EFT
  { slug: "eft", phrase: "use the form below to get involved", expect: "gone" },
  // --- Contemplatives
  { slug: "contemplatives", phrase: "you are invited to register and indicate which practice you will join", expect: "gone" },
  { slug: "contemplatives", phrase: "please join us for this beautiful prayer practice", expect: "present" },
  { slug: "contemplatives", phrase: "companion book", expect: "gone" },
  { slug: "contemplatives", phrase: "questions? use the form below", expect: "gone" },
  // --- Garden
  { slug: "garden-ministry", phrase: "contact jean maier", expect: "gone" },
  // --- Helping Hands
  { slug: "helping-hands-and-hearts", phrase: "two special collections are taken up", expect: "gone" },
  { slug: "helping-hands-and-hearts", phrase: "donation envelopes are provided every may and october", expect: "present" },
  // --- Hospitality
  { slug: "hospitality-ministry", phrase: "contact gail laughlin", expect: "gone" },
  // --- Kids Corner
  { slug: "kids-corner", phrase: "use the form below for more information about these programs", expect: "gone" },
  { slug: "kids-corner", phrase: "protecting god's children workshop, volunteer application and background check", expect: "present" },
  // --- Media
  { slug: "media-ministry", phrase: "interested in being part of our media ministry", expect: "gone" },
  // --- Counseling
  { slug: "saint-helen-counseling-project", phrase: "for additional information", expect: "gone" },
  { slug: "saint-helen-counseling-project", phrase: "most insurances are accepted", expect: "present" },
  { slug: "saint-helen-counseling-project", phrase: "all calls are confidential", expect: "present" },
  // --- Sing 'N Pray
  { slug: "sing-n-pray", phrase: "use the form below or the registration links", expect: "gone" },
  // --- Sister Pat's
  { slug: "sister-pats-kids-camp", phrase: "50/50 raffle - more information & ticket order form", expect: "present" },
  // --- Twelve
  { slug: "twelve", phrase: "twelve is a support group", expect: "present" },
  // --- Abide
  { slug: "young-adult-ministry", phrase: "ages 19", expect: "gone" },
  { slug: "young-adult-ministry", phrase: "ages 21-35", expect: "present" },
  { slug: "young-adult-ministry", phrase: "remove abide test", expect: "gone" },
  { slug: "young-adult-ministry", phrase: "learn more (button linking", expect: "gone" },
  { slug: "young-adult-ministry", phrase: "contact young adult coordinator", expect: "gone" },
  // --- Called
  { slug: "called", phrase: "learn more (button linking", expect: "gone" },
  // --- Grow / LifeLines / WWP
  { slug: "grow", phrase: "learn more (button linking", expect: "gone" },
  { slug: "lifelines", phrase: "learn more (button linking", expect: "gone" },
  { slug: "wwp", phrase: "learn more (button linking", expect: "gone" },
  { slug: "wwp", phrase: "questions? contact ellen murphy", expect: "gone" },
  // --- Pre-Cana
  { slug: "pre-cana", phrase: "preparing for a lifetime of love in christ", expect: "present" },
  { slug: "pre-cana", phrase: "program schedule & details", expect: "present" },
  { slug: "pre-cana", phrase: "our spring 2026 session has already taken place", expect: "present" },
  { slug: "pre-cana", phrase: "please call marielle brown at 908-232-1214", expect: "present" },
  // --- VBS
  { slug: "vbs", phrase: "button linking to standalone", expect: "gone" },
  // --- Sing 'N Pray dangling heading
  { slug: "sing-n-pray", phrase: "how do i register", expect: "gone" },
  // --- legacy "Sunday Experience" placeholders
  { slug: "altar-servers", phrase: "sunday experience", expect: "gone" },
  { slug: "hospitality-ministry", phrase: "sunday experience", expect: "gone" },
  // --- global artifacts
  { slug: "*", phrase: "cdn-cgi/l/email-protection", expect: "gone" },
  { slug: "*", phrase: "audit guidance", expect: "gone" },
];

async function main() {
  const all = await db.select().from(ministries);
  const bySlug = new Map(all.map((m) => [m.slug, m]));
  const allSections = await db
    .select({ parentId: pageSections.parentId, payload: pageSections.payload })
    .from(pageSections)
    .where(eq(pageSections.parentKind, "ministry"))
    .orderBy(asc(pageSections.position));
  const sectionsByParent = new Map<string, string[]>();
  for (const s of allSections) {
    const arr = sectionsByParent.get(s.parentId) ?? [];
    arr.push(JSON.stringify(s.payload));
    sectionsByParent.set(s.parentId, arr);
  }

  const corpus = (slug: string): string => {
    if (slug === "*") {
      return loose(
        all
          .map((m) => `${m.tagline ?? ""} ${m.description ?? ""} ${(sectionsByParent.get(m.id) ?? []).join(" ")}`)
          .join(" "),
      );
    }
    const m = bySlug.get(slug);
    if (!m) return "";
    return loose(
      `${m.name} ${m.tagline ?? ""} ${m.description ?? ""} ${(sectionsByParent.get(m.id) ?? []).join(" ")}`,
    );
  };

  let fails = 0;
  const cache = new Map<string, string>();
  for (const c of CHECKS) {
    if (!cache.has(c.slug)) cache.set(c.slug, corpus(c.slug));
    const text = cache.get(c.slug)!;
    const found = text.includes(loose(c.phrase));
    const ok = c.expect === "present" ? found : !found;
    if (!ok) fails += 1;
    console.log(`${ok ? "OK  " : "FAIL"} [${c.expect.toUpperCase().padEnd(7)}] ${c.slug}: "${c.phrase}"`);
  }
  console.log(`\n${fails} failure(s) of ${CHECKS.length} checks`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
