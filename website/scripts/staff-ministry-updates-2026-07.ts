/**
 * Staff-requested ministry updates — July 2026 review of the staging site.
 *
 * Source: parish staff punch list ("Saint Helen Ministries #1–51",
 * July 2026). Applies leader/recipient assignments, renames, copy edits,
 * and inquiry-form field changes across ministries + standalone pages.
 *
 * RUN (from website/):
 *   pnpm tsx --env-file=.env.local scripts/staff-ministry-updates-2026-07.ts --dry-run   # preview
 *   pnpm tsx --env-file=.env.local scripts/staff-ministry-updates-2026-07.ts             # apply
 *
 * Design:
 *   - Idempotent. Every operation checks current state first; a second
 *     run reports "already applied" and writes nothing.
 *   - Non-destructive by default: copy edits only fire when the target
 *     text is actually found; misses are logged loudly so leftovers can
 *     be fixed by hand in /admin.
 *   - Leader assignment upserts a `users` row (role ministry_lead — the
 *     inquiry route emails every lead of the ministry) and replace-sets
 *     the ministry_leads links. Existing users keep their current role.
 */

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  ministries,
  ministryLeads,
  pages,
  pageSections,
  siteSettings,
  users,
  type InquiryField,
  type MinistryInquiryConfig,
} from "../db/schema";

const DRY_RUN = process.argv.includes("--dry-run");

/* ------------------------------------------------------------------ */
/* Edit ops                                                            */
/* ------------------------------------------------------------------ */

type TextEdit =
  /** Replace exact substring (entity/apostrophe tolerant) in any string
   *  field of the description or section payloads. */
  | { op: "replace"; find: string; replace: string; note?: string }
  /** Regex replace across HTML strings (for spans that cross markup). */
  | { op: "regex"; pattern: string; replace: string; note?: string }
  /** Remove any block element (<p>/<li>/<h2-4>/<blockquote>) whose plain
   *  text contains this phrase. Also clears short standalone strings
   *  (section headings / taglines) that match. */
  | { op: "removeBlock"; contains: string; note?: string }
  /** Append HTML to the end of the string that contains the anchor
   *  phrase (idempotent — skipped when the html is already present). */
  | { op: "appendAfter"; anchor: string; html: string; note?: string };

type LeadSpec = { name: string; email: string };

type CustomFieldSpec = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "radio" | "checkboxes";
  options?: string[];
  required: boolean;
};

type MinistryPlan = {
  slug: string;
  /** New ministries.name */
  rename?: string;
  /** New ministries.tagline */
  tagline?: string;
  /** Replace-set of ministry leads (inquiry email recipients). */
  leads?: LeadSpec[];
  /** Fallback recipient if leads ever get cleared. */
  contactEmail?: string;
  /** Custom inquiry-form fields to ensure exist (matched by label). */
  customFields?: CustomFieldSpec[];
  /** Ensure a "Volunteer with <name>" button exists on the inquiry form
   *  (staff asked for a volunteer path on the standalone pages, which
   *  launched with Join + Ask-a-Question only). */
  ensureVolunteerButton?: boolean;
  /** Copy edits across description/tagline + page_sections. */
  edits?: TextEdit[];
  notes?: string;
};

type PagePlan = {
  slug: string;
  retitle?: string;
  edits?: TextEdit[];
  /** Set status archived (removes the /p/ page). */
  unpublish?: boolean;
  notes?: string;
};

/* ------------------------------------------------------------------ */
/* The staff punch list                                                */
/* ------------------------------------------------------------------ */

export const MINISTRY_PLANS: MinistryPlan[] = [
  // --- #1–12 · ministries without their own legacy webpage ----------
  {
    slug: "art-environment-ministry",
    leads: [{ name: "Jessica Nicolosi", email: "jessicaraemendoza@gmail.com" }],
    contactEmail: "arts@sainthelen.org",
    edits: [
      // "Please remove the first sentence (it is not necessary)"
      {
        op: "replace",
        find: "The Purpose of the Art and Environment Ministry: The Art and Environment Ministry serves",
        replace: "The Art and Environment Ministry serves",
        note: "drop 'The Purpose of…' prefix",
      },
      // Import defect: bolded subgroup names were lifted out of their
      // sentences ("Our is made up of…"). Restore the subject nouns.
      { op: "replace", find: "Our is made up of creative people", replace: "Our Design Guild is made up of creative people" },
      { op: "replace", find: "Our is made up of individuals", replace: "Our Labor & Construction Crew is made up of individuals" },
      { op: "replace", find: "Our oversees the care", replace: "Our Green Team oversees the care" },
      { op: "replace", find: "Our completes many crafts", replace: "Our Craft Team completes many crafts" },
      { op: "replace", find: "Our are needed for various dates", replace: "Our general volunteers are needed for various dates" },
      { op: "replace", find: "Our manages the many projects", replace: "Our Vacation Bible School Decor Planning Committee manages the many projects" },
    ],
    notes:
      "Form goes directly to Jessica's personal email per her note that she rarely checks arts@; arts@ kept as the fallback contact. Searchability of 'Art and Environment' is handled by the new /ministries search normalization (code change).",
  },
  {
    slug: "baptism-ministry",
    leads: [{ name: "Tracey Sowa", email: "tsowa@sainthelen.org" }],
    contactEmail: "tsowa@sainthelen.org",
    customFields: [
      {
        id: "bap-interest",
        label: "Which area are you interested in?",
        type: "radio",
        options: [
          "Hospitality (Bake or Provide Treats)",
          "Childcare Support",
          "Prayer & Encouragement Cards",
        ],
        required: true,
      },
    ],
    edits: [
      // Smooth the pandoc "---" artifacts into em dashes.
      { op: "replace", find: "community---and", replace: "community — and" },
      { op: "replace", find: "support---it's", replace: "support — it's" },
      { op: "replace", find: "them---trusting", replace: "them — trusting" },
      { op: "replace", find: "program---you're", replace: "program — you're" },
    ],
    notes:
      "'Why It Matters' heading already present on staging. Interest radio buttons added per staff request (the punch list filed these under 'Bakery Ministry' but the options are this page's volunteer roles).",
  },
  {
    slug: "church-cleaning-linen-ministry",
    leads: [{ name: "Marlene Rizk", email: "rizkm55@gmail.com" }],
    contactEmail: "rizkm55@gmail.com",
  },
  {
    slug: "lectors",
    rename: "Lector Ministry",
    leads: [{ name: "Joe Vaszily", email: "jmpv127@gmail.com" }],
    contactEmail: "jmpv127@gmail.com",
  },
  {
    slug: "nursing-home-ministry",
    leads: [{ name: "JoAnn Murphy", email: "email4joannm@yahoo.com" }],
    contactEmail: "email4joannm@yahoo.com",
  },
  {
    slug: "sacristans",
    rename: "Sacristan Ministry",
    leads: [{ name: "Marilyn Ryan", email: "mryan@sainthelen.org" }],
    contactEmail: "mryan@sainthelen.org",
  },
  {
    slug: "soup-kitchens-st-joe-s",
    rename: "Saint Joseph's Soup Kitchen",
    leads: [{ name: "Alice Brucia", email: "alicebrucia7@gmail.com" }],
    contactEmail: "alicebrucia7@gmail.com",
    notes:
      "Renamed to match the Ministry brochure ('Saint Joseph's Soup Kitchen'). Staff flagged asking Marilyn about the preferred title — easy to adjust in /admin if she prefers St. Joe's. The /ministries search matches 'St. Joseph's' and 'Saint Joseph's' either way.",
  },
  {
    slug: "soup-kitchens-st-mary-s",
    rename: "Saint Mary's Soup Kitchen",
    leads: [{ name: "Ellen Murphy", email: "ellenmurphy811@gmail.com" }],
    contactEmail: "ellenmurphy811@gmail.com",
    notes: "Renamed to match the Ministry brochure, consistent with Saint Joseph's.",
  },
  {
    slug: "sunday-gospel-alive-in-me",
    rename: "Sunday Gospel Alive in Me (GAIM)",
    leads: [{ name: "Michael Fusco", email: "mfusco@sainthelen.org" }],
    contactEmail: "mfusco@sainthelen.org",
  },
  {
    slug: "wedding-ministry",
    leads: [
      { name: "Denise Revello", email: "deniserevello@gmail.com" },
      { name: "Maribeth Vaszily", email: "maribethvaszily@gmail.com" },
    ],
    contactEmail: "deniserevello@gmail.com",
    notes:
      "Hero photo crop fixed in code (object-position bias so the couple's faces stay in frame).",
  },
  {
    slug: "westfield-food-pantry",
    rename: "Westfield Food Pantry Ministry",
    leads: [{ name: "Monica Bergin", email: "bergin5@comcast.net" }],
    contactEmail: "bergin5@comcast.net",
  },

  // --- #13–39 · ministries on the main ministry page ----------------
  {
    slug: "ageless",
    tagline:
      "A community of active, enthusiastic men and women journeying in the second half of their lives.",
    leads: [{ name: "JoAnn Murphy", email: "email4joannm@yahoo.com" }],
    contactEmail: "email4joannm@yahoo.com",
    edits: [
      // Page should begin with "Ageless is a community…" — remove the
      // goal paragraph, the LifeLines cross-link, and the section
      // heading that sit above it.
      {
        op: "removeBlock",
        contains: "The goal of Ageless at Saint Helen is to provide opportunities",
      },
      { op: "removeBlock", contains: "Check out LifeLines for more ways to connect" },
      { op: "removeBlock", contains: "More About Ageless at Saint Helen" },
      { op: "removeBlock", contains: "Questions about Ageless? Use the form below" },
    ],
  },
  {
    slug: "altar-servers",
    leads: [{ name: "Adrian Soltys", email: "asoltys@sainthelen.org" }],
    contactEmail: "asoltys@sainthelen.org",
    edits: [
      // Remove the email-contact line (its address is a broken
      // Cloudflare [email protected] artifact anyway).
      { op: "removeBlock", contains: "Contact Adrian Soltys at" },
    ],
  },
  {
    slug: "care-ministry",
    leads: [
      { name: "Janice Meister", email: "janmeister1@outlook.com" },
      { name: "Susan Dodge", email: "susanamdodge@gmail.com" },
    ],
    contactEmail: "janmeister1@outlook.com",
    edits: [
      // Restore Marilyn's phone + email (current copy has a broken
      // Cloudflare-obfuscated address).
      {
        op: "replace",
        find: "If this Care Ministry would benefit you or a loved one contact Marilyn Ryan at",
        replace: "If this Care Ministry would benefit you or a loved one, contact Marilyn Ryan at",
      },
      {
        op: "replace",
        find: "(908)232-1214 x 113",
        replace: "908-232-1214 x 113",
      },
    ],
    notes:
      "Marilyn's contact sentence email is repaired via the email-artifact sweep (broken '[email protected]' link → mryan@sainthelen.org).",
  },
  {
    slug: "caregivers-support",
    leads: [{ name: "Cathy Colon", email: "ccolon@comcast.net" }],
    contactEmail: "ccolon@comcast.net",
    edits: [
      { op: "replace", find: "7:30 PM in the Parish Library", replace: "7:30 PM in the Parish Center" },
      { op: "removeBlock", contains: "For information, please contact Cathy Colon" },
    ],
    notes: "Name already reads 'Caregiver's Support Ministry' on staging.",
  },
  {
    slug: "catholic-families-connect",
    leads: [{ name: "Debbie Abbattista", email: "abbattista@comcast.net" }],
    contactEmail: "abbattista@comcast.net",
    edits: [
      { op: "removeBlock", contains: "Questions about Catholic Families Connect? Use the form below" },
    ],
  },
  {
    slug: "childrens-liturgy-of-the-word",
    leads: [{ name: "Nicole Murphy", email: "nmurphy@sainthelen.org" }],
    contactEmail: "nmurphy@sainthelen.org",
    edits: [
      // Link the Protecting God's Children mention to the program page.
      {
        op: "replace",
        find: "Archdiocese of Newark's Protecting God's Children program",
        replace:
          '<a href="https://www.virtusonline.org/virtus/" target="_blank" rel="noopener noreferrer">Archdiocese of Newark’s Protecting God’s Children program</a>',
      },
      // The form is the call to action.
      {
        op: "removeBlock",
        contains: "Please consider volunteering in this wonderful ministry",
      },
      // Point readers at the description/calendar button.
      {
        op: "appendAfter",
        anchor: "Peer Ministers assist with prayers and handouts",
        html: "<p>Click the <strong>CLOW 25–26 Description &amp; Calendar</strong> button below for more detailed information.</p>",
      },
    ],
  },
  {
    slug: "4cs",
    leads: [{ name: "Alesia Porter", email: "njporters@comcast.net" }],
    contactEmail: "njporters@comcast.net",
    edits: [
      {
        op: "replace",
        find: "Trinitas Hospital in Elizabeth</p>",
        replace: "Trinitas Hospital in Elizabeth<br />Hackensack Meridian Health in Neptune</p>",
        note: "add hospital to the recipient list (br-separated <p> list)",
      },
    ],
  },
  {
    slug: "cornerstone",
    leads: [{ name: "Dan Knott", email: "danknott@gmail.com" }],
    contactEmail: "danknott@gmail.com",
  },
  {
    slug: "eft",
    leads: [{ name: "Nicole Murphy", email: "nmurphy@sainthelen.org" }],
    contactEmail: "nmurphy@sainthelen.org",
    edits: [
      { op: "removeBlock", contains: "There are many ways to join our team — use the form below" },
    ],
  },
  {
    slug: "contemplatives",
    leads: [{ name: "Patrick Manning", email: "pmanning87@gmail.com" }],
    contactEmail: "pmanning87@gmail.com",
    customFields: [
      {
        id: "ec-practice",
        label: "Which prayer practice will you participate in? (choose one or both)",
        type: "checkboxes",
        options: ["Contemplative Prayer", "Lectio Divina"],
        required: true,
      },
    ],
    edits: [
      {
        op: "replace",
        find: "You are invited to register and indicate which practice you will join:",
        replace:
          "Please join us for this beautiful prayer practice. Adult parishioners are invited to register below and indicate which practice you will participate in:",
      },
      // Remove the companion-book plug (and its Amazon link if present).
      {
        op: "replace",
        find: " Companion book: <em>Into the Silent Land</em> by Martin Laird.",
        replace: "",
      },
      { op: "replace", find: " Companion book: Into the Silent Land by Martin Laird.", replace: "" },
      { op: "removeBlock", contains: "Available on Amazon" },
      { op: "removeBlock", contains: "Questions? Use the form below and we will be in touch" },
    ],
  },
  {
    slug: "extraordinary-ministers-of-the-eucharist",
    leads: [{ name: "Marilyn Ryan", email: "mryan@sainthelen.org" }],
    contactEmail: "mryan@sainthelen.org",
  },
  {
    slug: "funeral-support",
    leads: [{ name: "Marielle Brown", email: "mbrown@sainthelen.org" }],
    contactEmail: "mbrown@sainthelen.org",
    notes: "Name already reads 'Funeral Support Ministry' on staging.",
  },
  {
    slug: "garden-ministry",
    leads: [{ name: "Jean Maier", email: "jeanamaier5@gmail.com" }],
    contactEmail: "jeanamaier5@gmail.com",
    customFields: [
      {
        id: "gm-availability",
        label: "Your Available Days and Times to Volunteer",
        type: "textarea",
        required: false,
      },
    ],
    edits: [
      { op: "removeBlock", contains: "Interested in helping? Contact Jean Maier" },
    ],
  },
  {
    slug: "helping-hands-and-hearts",
    leads: [{ name: "Marilyn Ryan", email: "mryan@sainthelen.org" }],
    contactEmail: "mryan@sainthelen.org",
    edits: [
      {
        op: "replace",
        find: "To provide financial assistance for these projects, two special collections are taken up each year and Memorials are accepted at any time.",
        replace:
          "To provide financial assistance for these projects, donation envelopes are provided every May and October. Memorials are accepted at any time.",
      },
    ],
  },
  {
    slug: "hospitality-ministry",
    leads: [
      { name: "Gail Laughlin", email: "glaughlin1@gmail.com" },
      { name: "Eileen Passananti", email: "epassananti@gmail.com" },
    ],
    contactEmail: "glaughlin1@gmail.com",
    edits: [
      // Contact sentence carries broken Cloudflare email artifacts and
      // the form is the call to action — remove it.
      { op: "removeBlock", contains: "please contact Gail Laughlin at" },
    ],
  },
  {
    slug: "kids-corner",
    rename: "Kids Corner (Ages 2-5)",
    leads: [{ name: "Tracey Sowa", email: "tsowa@sainthelen.org" }],
    contactEmail: "tsowa@sainthelen.org",
    edits: [
      { op: "removeBlock", contains: "Use the form below for more information about these programs" },
      {
        op: "appendAfter",
        anchor: "Kindergarten Worship",
        html: "<p>Please note, attendance at the Archdiocese of Newark’s Protecting God’s Children workshop, volunteer application and background check are all required prior to volunteering.</p>",
      },
    ],
  },
  {
    slug: "media-ministry",
    leads: [{ name: "Patricia Gomez", email: "pgomez@sainthelen.org" }],
    contactEmail: "pgomez@sainthelen.org",
    edits: [
      { op: "removeBlock", contains: "Interested in being part of our media ministry? Use the form below" },
    ],
    notes:
      "Checked the 'form looks different' report — the Get involved card on this page is identical markup/config to every other ministry (volunteer + question buttons); the page was just missing a section heading. No structural difference found.",
  },
  {
    slug: "mental-health-ministry",
    leads: [{ name: "Liz Migneco", email: "lmigneco@sainthelen.org" }],
    contactEmail: "lmigneco@sainthelen.org",
  },
  {
    slug: "peace-and-justice",
    leads: [{ name: "Shane McDermott", email: "mcdermottsp@comcast.net" }],
    contactEmail: "mcdermottsp@comcast.net",
    notes:
      "Name already reads 'Peace and Justice Ministry' on staging. Punch-list mailto had an 'at.mcdermottsp@…' typo; used mcdermottsp@comcast.net.",
  },
  {
    slug: "prayer-shawl",
    leads: [{ name: "Lori Gewirtz", email: "gewirtz47@yahoo.com" }],
    contactEmail: "gewirtz47@yahoo.com",
  },
  {
    slug: "respect-life-ministry",
    leads: [{ name: "Ashok Maliakal", email: "ashok.maliakal@gmail.com" }],
    contactEmail: "ashok.maliakal@gmail.com",
    notes:
      "The dated May 6 / 'Triumph of the Heart' announcements are already absent from staging. Ashok's IVF-talk video request needs a human: source footage + editing, then re-post (flagged in the run summary).",
  },
  {
    slug: "saint-helen-counseling-project",
    leads: [{ name: "Liz Migneco", email: "lmigneco@sainthelen.org" }],
    contactEmail: "lmigneco@sainthelen.org",
    edits: [
      // The old contact sentence (its email is a broken Cloudflare
      // artifact) goes; the insurance line staff asked for replaces it.
      {
        op: "regex",
        pattern: "\\s*For additional information[\\s\\S]*?All calls are confidential\\.",
        replace: " Most insurances are accepted and no one is denied services due to financial concerns. All calls are confidential.",
        note: "swap broken contact sentence for insurance line",
      },
    ],
  },
  {
    slug: "service-auction",
    leads: [{ name: "Ellen Murphy", email: "ellenmurphy811@gmail.com" }],
    contactEmail: "ellenmurphy811@gmail.com",
  },
  {
    slug: "sing-n-pray",
    leads: [{ name: "Megan Soltys", email: "msoltys@sainthelen.org" }],
    contactEmail: "msoltys@sainthelen.org",
    edits: [
      { op: "removeBlock", contains: "Use the form below or the registration links on the parish site" },
    ],
  },
  {
    slug: "sister-pats-kids-camp",
    leads: [
      { name: "Regina Cappio Wilson & James Hughes", email: "sisterpatskidscamp@gmail.com" },
    ],
    contactEmail: "sisterpatskidscamp@gmail.com",
    edits: [
      // Staff: "click button below for more information and to order
      // raffle tickets" — make the raffle link read like that button.
      {
        op: "replace",
        find: "Download 50/50 Raffle Order Form",
        replace: "50/50 Raffle — More Information & Ticket Order Form",
      },
    ],
    notes:
      "Two coordinators (Regina Cappio Wilson, James Hughes) share the sisterpatskidscamp@gmail.com inbox — modeled as one lead user on that address. Form config matches every other ministry; no structural difference found.",
  },
  {
    slug: "twelve",
    edits: [
      {
        op: "replace",
        find: "A support group for people impacted by a loved one having an addiction",
        replace: "Twelve is a support group for people impacted by a loved one having an addiction",
      },
    ],
  },

  // --- #40–51 · standalone-page ministries ---------------------------
  {
    slug: "young-adult-ministry",
    ensureVolunteerButton: true,
    rename: "Abide Young Adult Ministry (Ages 21-35)",
    tagline:
      "Abide is Saint Helen's Young Adult Ministry for adults ages 21–35 seeking authentic community, meaningful conversation, and a deeper relationship with Christ.",
    leads: [{ name: "Patricia Gomez", email: "pgomez@sainthelen.org" }],
    contactEmail: "pgomez@sainthelen.org",
    edits: [
      { op: "replace", find: "ages 21--35", replace: "ages 21–35" },
      { op: "replace", find: "ages 19–39", replace: "ages 21–35" },
      { op: "replace", find: "ages 19-39", replace: "ages 21-35" },
      // Leftover editorial notes from the import doc.
      { op: "removeBlock", contains: "Learn more (button linking to standalone Abide page)" },
      { op: "removeBlock", contains: "Remove Abide Test webpage" },
      // The form is the contact path now.
      { op: "removeBlock", contains: "please contact Young Adult Coordinator, Patricia Gomez" },
    ],
  },
  {
    slug: "adoration",
    ensureVolunteerButton: true,
    leads: [
      { name: "Tracey Sowa", email: "tsowa@sainthelen.org" },
      { name: "Laura Caliguire", email: "lauracaliguire@gmail.com" },
    ],
    contactEmail: "tsowa@sainthelen.org",
    notes:
      "Volunteer form already renders on /adoration. 'What volunteering entails' copy still owed by Tracey (flagged in run summary).",
  },
  {
    slug: "called",
    ensureVolunteerButton: true,
    leads: [{ name: "Carolyn Colonna", email: "carolyncolonna1231@gmail.com" }],
    contactEmail: "carolyncolonna1231@gmail.com",
    edits: [
      { op: "removeBlock", contains: "Learn more (button linking to standalone C&G page)" },
      { op: "removeBlock", contains: "Learn more (button linking to standalone C&amp;G page)" },
    ],
    notes:
      "'Called and Gifted' (spelled out) now matches via the /ministries search normalization (code change).",
  },
  {
    slug: "christlife",
    ensureVolunteerButton: true,
    leads: [{ name: "Patricia Gomez", email: "pgomez@sainthelen.org" }],
    contactEmail: "pgomez@sainthelen.org",
    notes: "Casing is already 'ChristLife' everywhere on staging; no 2025 dates remain on the ministry page.",
  },
  {
    slug: "basketball",
    ensureVolunteerButton: true,
    leads: [{ name: "John Lampariello", email: "john.lampariello@gmail.com" }],
    contactEmail: "john.lampariello@gmail.com",
    notes: "Name already reads 'CYO Basketball Program' on staging.",
  },
  {
    slug: "grow",
    ensureVolunteerButton: true,
    leads: [{ name: "Maria Auricchio", email: "mauricchio@sainthelen.org" }],
    contactEmail: "mauricchio@sainthelen.org",
    edits: [
      { op: "removeBlock", contains: "Learn more (button linking to standalone Growing in Faith page)" },
    ],
  },
  {
    slug: "lifelines",
    ensureVolunteerButton: true,
    leads: [{ name: "Maria Auricchio", email: "mauricchio@sainthelen.org" }],
    contactEmail: "mauricchio@sainthelen.org",
    edits: [
      { op: "removeBlock", contains: "Learn more (button linking to standalone" },
    ],
  },
  {
    slug: "pre-cana",
    rename: "Pre-Cana Marriage Preparation",
    leads: [{ name: "Margaret Manning", email: "boufalouf@gmail.com" }],
    contactEmail: "boufalouf@gmail.com",
    ensureVolunteerButton: true,
    edits: [
      // Restore the staff-provided "Preparing for a Lifetime of Love in
      // Christ" intro ahead of the current opening paragraph.
      {
        op: "replace",
        find: "<p>Our Pre-Cana Marriage Preparation program is a warm, inviting",
        replace:
          "<h2>Preparing for a Lifetime of Love in Christ</h2><p>Congratulations on your engagement! At Saint Helen, we are honored to support you as you prepare for this sacred commitment through our Pre-Cana Marriage Preparation program. If you have not already reached out to the Parish office to secure your wedding date, please call Marielle Brown at 908-232-1214.</p><p>Our Pre-Cana Marriage Preparation program is a warm, inviting",
        note: "prepend Preparing-for-a-Lifetime intro",
      },
      // Staff-provided schedule copy (with its heading).
      {
        op: "replace",
        find: "We offer two sessions each fall and spring, typically in October or November and February or March. Stay tuned for upcoming session dates, posted over the summer.",
        replace:
          "</p><h2>Program Schedule &amp; Details</h2><p>We offer two convenient sessions each fall and spring, typically held in October or November and February or March. Our spring 2026 session has already taken place. Stay tuned for the Fall 2026 and Spring 2027 session dates which will be posted over the summer.",
        note: "swap in staff schedule copy + heading",
      },
    ],
    notes:
      "'Pre Cana' (no hyphen) now matches via the /ministries search normalization (code change). The sign-up button already reads the full 'Pre-Cana Marriage Preparation' name (the old shared-form radio button doesn't exist on the new site).",
  },
  {
    slug: "wwp",
    ensureVolunteerButton: true,
    leads: [{ name: "Ellen Murphy", email: "ellenmurphy811@gmail.com" }],
    contactEmail: "ellenmurphy811@gmail.com",
    edits: [
      { op: "removeBlock", contains: "Questions? Contact Ellen Murphy" },
      { op: "removeBlock", contains: "Learn more (button linking to standalone Walking With Purpose page)" },
      { op: "removeBlock", contains: "(button linking to standalone Walking With Purpose page)" },
    ],
  },
  // music / vbs / youth-ministry — approved as is; no changes.
];

/** Page-table (/p/…) standalone twins. Filled in from the July review. */
const PAGE_PLANS: PagePlan[] = [];

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

let CHANGES = 0;
let MISSES = 0;

function log(line: string) {
  console.log(line);
}
function miss(line: string) {
  MISSES += 1;
  console.log(`  ⚠️  MISS  ${line}`);
}
function hit(line: string) {
  CHANGES += 1;
  console.log(`  ✏️   ${line}`);
}

/** Decode the entities that show up in our sanitized HTML so matching
 *  is tolerant of &amp; / &rsquo; / curly quotes. */
export function looseText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&(rsquo|#8217|apos|#39);/g, "'")
    .replace(/&(lsquo|#8216);/g, "'")
    .replace(/&(rdquo|ldquo|#822[01]);/g, '"')
    .replace(/&(ndash|#8211);/g, "-")
    .replace(/&(mdash|#8212);/g, "-")
    .replace(/&nbsp;/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizePhrase(s: string): string {
  return looseText(s);
}

const BLOCK_RE = /<(p|li|h2|h3|h4|blockquote)\b[^>]*>[\s\S]*?<\/\1>/gi;

/** Remove block elements whose text contains the phrase. Returns the
 *  new html + count removed. Falls back to clearing short standalone
 *  strings (section-header headings, taglines) that match the phrase
 *  but carry no block markup. */
export function removeBlocks(html: string, phrase: string): { html: string; removed: number } {
  const needle = normalizePhrase(phrase);
  let removed = 0;
  const out = html.replace(BLOCK_RE, (m) => {
    if (looseText(m).includes(needle)) {
      removed += 1;
      return "";
    }
    return m;
  });
  if (removed === 0 && !/<(p|li|h2|h3|h4|blockquote)\b/i.test(html)) {
    // Plain string field (heading / tagline / label) — clear it when it
    // is essentially the phrase itself.
    if (html.length < 300 && looseText(html).includes(needle)) {
      return { html: "", removed: 1 };
    }
  }
  // Drop <ul>/<ol> left empty by <li> removals.
  const cleaned = out.replace(/<(ul|ol)\b[^>]*>\s*<\/\1>/gi, "");
  return { html: cleaned, removed };
}

/** Variant-tolerant substring replace: tries the literal string, then a
 *  version with common entity/apostrophe/dash variants. */
export function tolerantReplace(
  haystack: string,
  find: string,
  replace: string,
): { html: string; count: number } {
  const variants = new Set<string>([find]);
  variants.add(find.replace(/&/g, "&amp;"));
  variants.add(find.replace(/'/g, "’"));
  variants.add(find.replace(/&/g, "&amp;").replace(/'/g, "’"));
  variants.add(find.replace(/—/g, "&mdash;"));
  variants.add(find.replace(/–/g, "&ndash;"));
  variants.add(find.replace(/—/g, " — "));
  let count = 0;
  let out = haystack;
  for (const v of variants) {
    if (!v || !out.includes(v)) continue;
    out = out.split(v).join(replace);
    count += 1;
    break;
  }
  return { html: out, count };
}

/** Walk every string field of a JSON payload, applying fn. */
export function walkStrings(value: unknown, fn: (s: string) => string): unknown {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => walkStrings(v, fn));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walkStrings(v, fn);
    }
    return out;
  }
  return value;
}

type EditTarget = {
  label: string;
  get: () => Promise<{ id: string; value: unknown }[]>;
  set: (id: string, value: unknown) => Promise<void>;
};

/** Apply one TextEdit across a list of string-bearing targets. */
async function applyEdits(
  edits: TextEdit[],
  targets: EditTarget[],
): Promise<void> {
  for (const edit of edits) {
    if (!edit || !("op" in edit)) continue;
    let applied = 0;
    for (const target of targets) {
      const rows = await target.get();
      for (const row of rows) {
        let changed = false;
        const next = walkStrings(row.value, (s) => {
          if (edit.op === "replace") {
            const { html, count } = tolerantReplace(s, edit.find, edit.replace);
            if (count > 0) changed = true;
            return html;
          }
          if (edit.op === "regex") {
            const re = new RegExp(edit.pattern, "g");
            if (re.test(s)) {
              changed = true;
              return s.replace(new RegExp(edit.pattern, "g"), edit.replace);
            }
            return s;
          }
          if (edit.op === "removeBlock") {
            const { html, removed } = removeBlocks(s, edit.contains);
            if (removed > 0) changed = true;
            return html;
          }
          if (edit.op === "appendAfter") {
            if (
              looseText(s).includes(normalizePhrase(edit.anchor)) &&
              !looseText(s).includes(normalizePhrase(edit.html))
            ) {
              changed = true;
              return s + edit.html;
            }
            return s;
          }
          return s;
        });
        if (changed) {
          applied += 1;
          if (!DRY_RUN) await target.set(row.id, next);
          hit(
            `${target.label} ${describeEdit(edit)}${DRY_RUN ? "  (dry run)" : ""}`,
          );
        }
      }
    }
    if (applied === 0) {
      miss(`${describeEdit(edit)} — target text not found (may already be fixed)`);
    }
  }
}

function describeEdit(edit: TextEdit): string {
  if (edit.op === "replace") return `replace "${truncate(edit.find)}"`;
  if (edit.op === "regex") return `regex "${truncate(edit.pattern)}"`;
  if (edit.op === "removeBlock") return `remove block containing "${truncate(edit.contains)}"`;
  return `append after "${truncate(edit.anchor)}"`;
}
function truncate(s: string, n = 64): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/* -------------------- leads ---------------------------------------- */

async function ensureLeadUser(spec: LeadSpec): Promise<string> {
  const email = spec.email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    if (!existing.name && !DRY_RUN) {
      await db.update(users).set({ name: spec.name }).where(eq(users.id, existing.id));
    }
    return existing.id;
  }
  if (DRY_RUN) {
    log(`  ➕  would create user ${spec.name} <${email}> (ministry_lead)`);
    return `dry-run-${email}`;
  }
  const [created] = await db
    .insert(users)
    .values({ email, name: spec.name, role: "ministry_lead" })
    .returning({ id: users.id });
  log(`  ➕  created user ${spec.name} <${email}> (ministry_lead)`);
  return created!.id;
}

async function replaceLeads(ministryId: string, specs: LeadSpec[]): Promise<void> {
  const targetIds: string[] = [];
  for (const spec of specs) targetIds.push(await ensureLeadUser(spec));

  const current = await db
    .select({ userId: ministryLeads.userId, email: users.email })
    .from(ministryLeads)
    .innerJoin(users, eq(ministryLeads.userId, users.id))
    .where(eq(ministryLeads.ministryId, ministryId));

  const targetEmails = new Set(specs.map((s) => s.email.toLowerCase()));
  const toRemove = current.filter((c) => !targetEmails.has(c.email.toLowerCase()));
  const currentIds = new Set(current.map((c) => c.userId));
  const toAdd = targetIds.filter((id) => !currentIds.has(id) && !id.startsWith("dry-run-"));

  if (toRemove.length === 0 && toAdd.length === 0 && !DRY_RUN) {
    log(`  ✓  leads already correct (${specs.map((s) => s.email).join(", ")})`);
    return;
  }
  if (DRY_RUN) {
    if (toRemove.length > 0)
      log(`  ➖  would remove leads: ${toRemove.map((r) => r.email).join(", ")}`);
    const addEmails = specs
      .filter((s) => ![...current.map((c) => c.email.toLowerCase())].includes(s.email.toLowerCase()))
      .map((s) => s.email);
    if (addEmails.length > 0) log(`  ➕  would add leads: ${addEmails.join(", ")}`);
    if (toRemove.length === 0 && addEmails.length === 0)
      log(`  ✓  leads already correct (${specs.map((s) => s.email).join(", ")})`);
    return;
  }
  if (toRemove.length > 0) {
    await db
      .delete(ministryLeads)
      .where(
        and(
          eq(ministryLeads.ministryId, ministryId),
          inArray(ministryLeads.userId, toRemove.map((r) => r.userId)),
        ),
      );
    hit(`removed leads: ${toRemove.map((r) => r.email).join(", ")}`);
  }
  for (const [i, userId] of targetIds.entries()) {
    if (currentIds.has(userId)) continue;
    await db.insert(ministryLeads).values({
      userId,
      ministryId,
      isPrimary: i === 0,
    });
    hit(`added lead: ${specs[i]!.email}`);
  }
}

/* -------------------- inquiry config -------------------------------- */

const DEFAULT_SYSTEM_FIELDS: InquiryField[] = [
  { kind: "system", systemKey: "name", label: "Your name", required: true, shown: true },
  { kind: "system", systemKey: "email", label: "Email", required: true, shown: true },
  { kind: "system", systemKey: "phone", label: "Phone (optional)", required: false, shown: true },
  {
    kind: "system",
    systemKey: "message",
    label: "Anything you'd like the leader to know? (optional)",
    required: false,
    shown: true,
  },
];

function ensureCustomFields(
  cfg: MinistryInquiryConfig,
  specs: CustomFieldSpec[],
): { cfg: MinistryInquiryConfig; added: string[] } {
  const fields: InquiryField[] =
    cfg.fields && cfg.fields.length > 0 ? [...cfg.fields] : [...DEFAULT_SYSTEM_FIELDS];
  const added: string[] = [];
  for (const spec of specs) {
    const exists = fields.some(
      (f) => f.kind === "custom" && f.label.trim().toLowerCase() === spec.label.trim().toLowerCase(),
    );
    if (exists) continue;
    fields.push({
      kind: "custom",
      id: spec.id,
      label: spec.label,
      type: spec.type,
      options: spec.options,
      required: spec.required,
    });
    added.push(spec.label);
  }
  return { cfg: { ...cfg, fields }, added };
}

/* -------------------- per-ministry driver --------------------------- */

async function processMinistry(plan: MinistryPlan): Promise<void> {
  const [m] = await db
    .select()
    .from(ministries)
    .where(eq(ministries.slug, plan.slug))
    .limit(1);
  if (!m) {
    log(`\n### ${plan.slug}`);
    miss(`ministry not found in DB — skipped entirely`);
    return;
  }
  log(`\n### ${m.name}  (${plan.slug})`);

  // Rename
  if (plan.rename && m.name !== plan.rename) {
    if (!DRY_RUN) {
      await db.update(ministries).set({ name: plan.rename }).where(eq(ministries.id, m.id));
    }
    hit(`rename "${m.name}" → "${plan.rename}"${DRY_RUN ? "  (dry run)" : ""}`);
  } else if (plan.rename) {
    log(`  ✓  name already "${plan.rename}"`);
  }

  // Tagline
  if (plan.tagline && m.tagline !== plan.tagline) {
    if (!DRY_RUN) {
      await db.update(ministries).set({ tagline: plan.tagline }).where(eq(ministries.id, m.id));
    }
    hit(`tagline updated${DRY_RUN ? "  (dry run)" : ""}`);
  }

  // Contact email fallback
  if (plan.contactEmail && (m.contactEmail ?? "").toLowerCase() !== plan.contactEmail.toLowerCase()) {
    if (!DRY_RUN) {
      await db
        .update(ministries)
        .set({ contactEmail: plan.contactEmail })
        .where(eq(ministries.id, m.id));
    }
    hit(`contactEmail → ${plan.contactEmail}${DRY_RUN ? "  (dry run)" : ""}`);
  }

  // Leads
  if (plan.leads && plan.leads.length > 0) {
    await replaceLeads(m.id, plan.leads);
  }

  // Inquiry config — volunteer button + custom fields, one write.
  if (plan.ensureVolunteerButton || (plan.customFields && plan.customFields.length > 0)) {
    let cfg: MinistryInquiryConfig = m.inquiryConfig;
    const changes: string[] = [];

    if (plan.ensureVolunteerButton) {
      const hasVolunteer = cfg.buttons.some((b) => b.kind === "volunteer" && b.enabled);
      if (!hasVolunteer) {
        const name = plan.rename ?? m.name;
        cfg = {
          ...cfg,
          enabled: true,
          buttons: [
            { kind: "volunteer" as const, label: `Volunteer with ${name}`, enabled: true },
            ...cfg.buttons.filter((b) => b.kind !== "volunteer"),
          ],
        };
        changes.push("added Volunteer button");
      }
    }

    if (plan.customFields && plan.customFields.length > 0) {
      const result = ensureCustomFields(cfg, plan.customFields);
      cfg = result.cfg;
      if (result.added.length > 0) {
        changes.push(`added field(s) ${result.added.map((a) => `"${a}"`).join(", ")}`);
      }
    }

    if (changes.length > 0) {
      if (!DRY_RUN) {
        await db.update(ministries).set({ inquiryConfig: cfg }).where(eq(ministries.id, m.id));
      }
      hit(`inquiry form: ${changes.join("; ")}${DRY_RUN ? "  (dry run)" : ""}`);
    } else {
      log(`  ✓  inquiry form already configured`);
    }
  }

  // Copy edits — description/tagline + this ministry's page_sections.
  if (plan.edits && plan.edits.length > 0) {
    const targets: EditTarget[] = [
      {
        label: "[description]",
        get: async () => {
          const [row] = await db
            .select({ id: ministries.id, description: ministries.description, tagline: ministries.tagline })
            .from(ministries)
            .where(eq(ministries.id, m.id))
            .limit(1);
          return row ? [{ id: row.id, value: { description: row.description, tagline: row.tagline } }] : [];
        },
        set: async (id, value) => {
          const v = value as { description: string | null; tagline: string | null };
          await db
            .update(ministries)
            .set({ description: v.description, tagline: v.tagline })
            .where(eq(ministries.id, id));
        },
      },
      {
        label: "[section]",
        get: async () =>
          (
            await db
              .select({ id: pageSections.id, payload: pageSections.payload })
              .from(pageSections)
              .where(
                and(eq(pageSections.parentKind, "ministry"), eq(pageSections.parentId, m.id)),
              )
              .orderBy(asc(pageSections.position))
          ).map((r) => ({ id: r.id, value: r.payload })),
        set: async (id, value) => {
          await db
            .update(pageSections)
            .set({ payload: value as (typeof pageSections.$inferInsert)["payload"] })
            .where(eq(pageSections.id, id));
        },
      },
    ];
    await applyEdits(plan.edits, targets);
  }

  if (plan.notes) log(`  ℹ️   ${plan.notes}`);
}

/* -------------------- per-page driver -------------------------------- */

async function processPage(plan: PagePlan): Promise<void> {
  const [p] = await db.select().from(pages).where(eq(pages.slug, plan.slug)).limit(1);
  if (!p) {
    log(`\n### /p/${plan.slug}`);
    miss(`page not found in DB — skipped`);
    return;
  }
  log(`\n### /p/${p.slug}  ("${p.title}")`);

  if (plan.retitle && p.title !== plan.retitle) {
    if (!DRY_RUN) await db.update(pages).set({ title: plan.retitle }).where(eq(pages.id, p.id));
    hit(`retitle "${p.title}" → "${plan.retitle}"${DRY_RUN ? "  (dry run)" : ""}`);
  }

  if (plan.unpublish && p.status === "published") {
    if (!DRY_RUN) await db.update(pages).set({ status: "archived" }).where(eq(pages.id, p.id));
    hit(`unpublished /p/${p.slug}${DRY_RUN ? "  (dry run)" : ""}`);
  } else if (plan.unpublish) {
    log(`  ✓  already unpublished`);
  }

  if (plan.edits && plan.edits.length > 0) {
    const targets: EditTarget[] = [
      {
        label: "[page summary]",
        get: async () => {
          const [row] = await db
            .select({ id: pages.id, summary: pages.summary })
            .from(pages)
            .where(eq(pages.id, p.id))
            .limit(1);
          return row ? [{ id: row.id, value: { summary: row.summary } }] : [];
        },
        set: async (id, value) => {
          const v = value as { summary: string | null };
          await db.update(pages).set({ summary: v.summary }).where(eq(pages.id, id));
        },
      },
      {
        label: "[page section]",
        get: async () =>
          (
            await db
              .select({ id: pageSections.id, payload: pageSections.payload })
              .from(pageSections)
              .where(and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, p.id)))
              .orderBy(asc(pageSections.position))
          ).map((r) => ({ id: r.id, value: r.payload })),
        set: async (id, value) => {
          await db
            .update(pageSections)
            .set({ payload: value as (typeof pageSections.$inferInsert)["payload"] })
            .where(eq(pageSections.id, id));
        },
      },
    ];
    await applyEdits(plan.edits, targets);
  }

  if (plan.notes) log(`  ℹ️   ${plan.notes}`);
}

/* -------------------- broken email artifacts ------------------------- */

/**
 * The WordPress scrape leaked Cloudflare email obfuscation into several
 * pages: anchors to /cdn-cgi/l/email-protection rendering literally as
 * "[email protected]". Repair the ones we know the real address for;
 * strip any leftover into plain text so nothing renders a dead link.
 */
const EMAIL_REPAIRS: { slug: string; email: string }[] = [
  { slug: "care-ministry", email: "mryan@sainthelen.org" },
  { slug: "caregivers-support", email: "ccolon@comcast.net" },
  { slug: "garden-ministry", email: "jeanamaier5@gmail.com" },
  { slug: "altar-servers", email: "asoltys@sainthelen.org" },
  { slug: "hospitality-ministry", email: "glaughlin1@gmail.com" },
  { slug: "saint-helen-counseling-project", email: "lmigneco@sainthelen.org" },
];

const CF_ANCHOR_RE =
  /<a[^>]+href="[^"]*\/cdn-cgi\/l\/email-protection[^"]*"[^>]*>[\s\S]*?<\/a>/gi;

async function repairEmailArtifacts(): Promise<void> {
  log(`\n### Broken "[email protected]" artifacts`);
  for (const { slug, email } of EMAIL_REPAIRS) {
    const [m] = await db
      .select({ id: ministries.id, description: ministries.description })
      .from(ministries)
      .where(eq(ministries.slug, slug))
      .limit(1);
    if (!m) continue;
    const rows = await db
      .select({ id: pageSections.id, payload: pageSections.payload })
      .from(pageSections)
      .where(and(eq(pageSections.parentKind, "ministry"), eq(pageSections.parentId, m.id)));
    const anchor = `<a href="mailto:${email}">${email}</a>`;
    let repaired = 0;

    const fix = (s: string) => {
      const next = s.replace(CF_ANCHOR_RE, anchor);
      if (next !== s) repaired += 1;
      return next;
    };

    if (m.description) {
      const next = fix(m.description);
      if (next !== m.description && !DRY_RUN) {
        await db.update(ministries).set({ description: next }).where(eq(ministries.id, m.id));
      }
    }
    for (const row of rows) {
      const next = walkStrings(row.payload, fix);
      if (JSON.stringify(next) !== JSON.stringify(row.payload) && !DRY_RUN) {
        await db
          .update(pageSections)
          .set({ payload: next as (typeof pageSections.$inferInsert)["payload"] })
          .where(eq(pageSections.id, row.id));
      }
    }
    if (repaired > 0) hit(`${slug}: ${repaired} obfuscated link(s) → ${email}${DRY_RUN ? "  (dry run)" : ""}`);
    else log(`  ✓  ${slug}: no broken email links found`);
  }
}

/* -------------------- redirects -------------------------------------- */

/** Legacy standalone URLs that should land on the ministry page. */
const REDIRECT_ADDS: { from: string; to: string }[] = [
  { from: "/veg-garden", to: "/ministries/garden-ministry" },
  { from: "/kids-corner", to: "/ministries/kids-corner" },
];

async function ensureRedirects(): Promise<void> {
  log(`\n### Redirects`);
  const [settings] = await db
    .select({ redirects: siteSettings.redirects })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!settings) {
    miss("site_settings singleton not found");
    return;
  }
  type Redirect = { from: string; to: string; permanent?: boolean; _note?: string };
  const list: Redirect[] = Array.isArray(settings.redirects)
    ? ([...(settings.redirects as Redirect[])] as Redirect[])
    : [];
  let added = 0;
  for (const r of REDIRECT_ADDS) {
    if (list.some((x) => x.from === r.from)) {
      log(`  ✓  ${r.from} already redirects`);
      continue;
    }
    list.push({ ...r, permanent: true, _note: "staff request 2026-07: retire standalone page" });
    added += 1;
    hit(`${r.from} → ${r.to}${DRY_RUN ? "  (dry run)" : ""}`);
  }
  if (added > 0 && !DRY_RUN) {
    await db
      .update(siteSettings)
      .set({ redirects: list as (typeof siteSettings.$inferInsert)["redirects"] })
      .where(eq(siteSettings.id, 1));
  }
}

/* -------------------- dead "/p/…" learn-more buttons ------------------ */

/**
 * Several ministry pages shipped a "Learn more on the full page" button
 * pointing at /p/<slug> — but those standalone /p/ pages were never
 * published, so the buttons 404. Remove any button_group / link_list
 * item that targets a /p/ slug with no published page behind it; drop
 * the whole section if it ends up empty.
 */
async function removeDeadStandaloneButtons(): Promise<void> {
  log(`\n### Dead "/p/…" learn-more buttons`);
  const publishedPages = await db
    .select({ slug: pages.slug })
    .from(pages)
    .where(eq(pages.status, "published"));
  const liveSlugs = new Set(publishedPages.map((p) => p.slug));

  const sections = await db
    .select({
      id: pageSections.id,
      parentId: pageSections.parentId,
      kind: pageSections.kind,
      payload: pageSections.payload,
    })
    .from(pageSections)
    .where(eq(pageSections.parentKind, "ministry"));

  let touched = 0;
  for (const s of sections) {
    if (s.kind !== "button_group" && s.kind !== "link_list") continue;
    const payload = s.payload as { items?: { url?: string; href?: string }[] } & Record<string, unknown>;
    const items = payload.items;
    if (!Array.isArray(items) || items.length === 0) continue;
    const keep = items.filter((it) => {
      const url = (it.url ?? it.href ?? "") as string;
      const match = /^\/p\/([a-z0-9-]+)\/?$/.exec(url);
      if (!match) return true;
      return liveSlugs.has(match[1]!);
    });
    if (keep.length === items.length) continue;
    touched += 1;
    if (keep.length === 0) {
      if (!DRY_RUN) await db.delete(pageSections).where(eq(pageSections.id, s.id));
      hit(`removed ${s.kind} section pointing at unpublished /p/ page${DRY_RUN ? "  (dry run)" : ""}`);
    } else {
      if (!DRY_RUN) {
        await db
          .update(pageSections)
          .set({ payload: { ...payload, items: keep } as (typeof pageSections.$inferInsert)["payload"] })
          .where(eq(pageSections.id, s.id));
      }
      hit(`pruned dead /p/ link(s) from ${s.kind} section${DRY_RUN ? "  (dry run)" : ""}`);
    }
  }
  if (touched === 0) log(`  ✓  no dead /p/ buttons found`);
}

/* -------------------- main ------------------------------------------- */

async function main() {
  console.log(
    `Staff ministry updates — July 2026${DRY_RUN ? "  (DRY RUN — no writes)" : ""}\n` +
      `${MINISTRY_PLANS.length} ministries, ${PAGE_PLANS.length} standalone pages\n`,
  );

  for (const plan of MINISTRY_PLANS) await processMinistry(plan);
  for (const plan of PAGE_PLANS) await processPage(plan);
  await repairEmailArtifacts();
  await removeDeadStandaloneButtons();
  await ensureRedirects();

  console.log(`\n──────────────────────────────────────────`);
  console.log(`${DRY_RUN ? "Would apply" : "Applied"} ${CHANGES} change(s); ${MISSES} miss(es).`);
  if (MISSES > 0) {
    console.log(
      `Misses usually mean the text was already fixed in admin — verify the page and clean up by hand if needed.`,
    );
  }
  console.log(
    `\nRemember: public pages revalidate within 10–60 min. To flip immediately, save any row in /admin (revalidateTag) or redeploy.`,
  );
}

// Only run when executed directly (helpers are imported by tests).
if (process.argv[1]?.includes("staff-ministry-updates-2026-07")) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
