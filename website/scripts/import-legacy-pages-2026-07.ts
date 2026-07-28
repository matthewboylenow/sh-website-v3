/**
 * Wave 18 — July 2026 legacy-URL reconciliation.
 *
 * Ensures every remaining URL from the live sainthelen.org sitemap exists
 * on the Next.js side. Creates ~23 CMS pages (pages table + page_sections
 * blocks) with content pulled from the live WordPress site on 2026-07-28,
 * merges the matching redirects into siteSettings.redirects, and fills the
 * empty giving settings (primary URL + memorial/restricted designations).
 *
 * Idempotent: pages upsert on slug with replace-set sections; redirects
 * merge by `from`; giving fields only fill when currently empty so admin
 * edits are never clobbered.
 *
 * Run:  pnpm tsx --env-file=.env.local scripts/import-legacy-pages-2026-07.ts
 * Add DRY_RUN=1 to preview without writing.
 *
 * ⚠️  Many bodies link to https://sainthelen.org/wp-content/uploads/… PDFs.
 * Those resolve against the live WordPress host and MUST be migrated to
 * Vercel Blob (or re-linked) before the DNS flip. grep for "wp-content"
 * across page_sections to find them all.
 */

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  pages,
  pageSections,
  siteSettings,
  type GivingSettings,
  type PageSectionPayload,
  type Redirect,
} from "../db/schema";
import { htmlToBlocks } from "./_html-to-blocks";

const DRY_RUN = process.env.DRY_RUN === "1";

function mdToSafeHtml(md: string): string {
  const raw = marked.parse(md.trim(), { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "a", "ul", "ol", "li", "blockquote",
      "h2", "h3", "h4", "h5", "h6", "hr", "code", "pre",
    ],
    allowedAttributes: { a: ["href", "name", "target", "rel"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      h1: "h2",
    },
  });
}

type PageSeed = {
  slug: string;
  title: string;
  summary: string;
  md: string;
  /** Blocks prepended before the converted body (CTA button rows etc.). */
  introBlocks?: PageSectionPayload[];
};

const SEEDS: PageSeed[] = [
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "pgc",
    title: "Protecting God's Children",
    summary:
      "Safe-environment requirements for all Saint Helen staff and volunteers — workshop registration, code of conduct, and volunteer application.",
    md: `
Dear Parents and Friends of the Parish Community of Saint Helen,

Thank you for volunteering to spend your time and talents with our children.

Based on the guidelines established in the Dallas Charter for Protecting God's Children, our Archdiocese has implemented the following three requirements for all parish staff and all volunteers.

## 1. Attend a Protecting God's Children Workshop

Attendance at a Protecting God's Children Workshop, a sexual abuse awareness program that is being held throughout the Archdiocese. Please register yourself online at the seminar of your choice and return the certificate of attendance to a Saint Helen staff member after completing the program. [Find the schedule of seminars & registration link here](https://www.virtusonline.org/virtus/reg_list2.cfm?theOrgID=16839&theme=0).

The online registration process for the workshop above will guide you through steps 2 and 3.

*Recertification is required every 5 years. Please see below for details on recertification.*

## 2. Read the Policy Document and Sign

As part of the online process for the workshop above, you will be prompted to read the [Policies on Professional and Ministerial Conduct](https://sainthelen.org/wp-content/uploads/2019/10/Code-of-Conduct-2019.pdf) and electronically sign the Acknowledgement of Compliance and Archdiocesan Code of Ethics (Appendix B, found on page 23). Your signature acknowledges your understanding and acceptance of the Policy. A hard copy of your acknowledgement is also required for our records. Please sign and return it with your completed volunteer application (see step 3 below).

## 3. Complete a Volunteer Application

All volunteers are required to complete a [volunteer application](https://rcan.org/wp-content/uploads/2026/03/Volunteer-Application-English-March-2026.pdf) which includes your authorization for a criminal history review based on your name, social security number, and date of birth. Please submit the volunteer application to the Ministry Lead you are volunteering with. If you continue to be active at Saint Helen, a criminal background check will be performed every five years based on this authorization.

When you go through the online background check process, you may notice an option to cover the cost of the check yourself, presented as a charitable donation. We want to make it absolutely clear that this is an optional choice, not an expectation.

Our parish is fully prepared and happy to cover the cost of your background check. If you prefer not to pay, simply select the option that allows the parish to cover the fee. Please do not feel any obligation to pay for it yourself. Your gift of time and talent is more than enough, and we are profoundly grateful for your service.

## Need to Attend the Workshop Again?

Volunteers must retrain every five years. If you took Protecting God's Children more than 5 years ago you must update your certification with a mandated online module. This is a 60-minute session. You must sign up for this using your original Virtus login. You will have the module assigned to you on your VIRTUS home page.

## How to Report Abuse

The Archdiocese of Newark takes very seriously any and all allegations of sexual misconduct by members of the clergy, Religious, and lay staff of the Archdiocese. For more on how to report abuse, visit the [Archdiocese of Newark's Child & Youth Protection office](https://www.rcan.org/offices-and-ministries/child-youth-protection/abuse-allegations).
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "inclusive-mass",
    title: "Inclusive Mass",
    summary:
      "A welcoming, comfortable, and supportive liturgy for individuals of all abilities and their families. All Masses at 2:00 PM at Saint Helen Church.",
    introBlocks: [
      {
        kind: "button_group",
        header: {
          eyebrow: "All Are Welcome",
          heading: "Inclusive Mass",
          subheading:
            "A welcoming, comfortable, and supportive liturgy for individuals of all abilities and their families. All Masses at 2:00 PM at Saint Helen Church.",
        },
        items: [
          {
            label: "Join Our Mailing List",
            href: "https://my.sainthelen.org/OnlineReg/3218",
            variant: "primary",
          },
          {
            label: "Download Mass Follow-Along",
            href: "https://sainthelen.org/wp-content/uploads/2025/12/Inclusive-Mass-Follow-Along-Final.pdf",
            variant: "secondary",
          },
        ],
      },
    ],
    md: `
## A Place Where Everyone Belongs

At Saint Helen, we are committed to creating a welcoming and inclusive community where individuals of all abilities and their families can fully participate in the life of the Church. Our Inclusive Masses are designed to provide a welcoming, comfortable, and supportive environment for individuals with disabilities and their families.

**All are welcome!**

## What to Expect

Our Inclusive Mass is thoughtfully designed with accessibility in mind, offering a peaceful environment where everyone can fully participate in worship.

- **Gentler pacing & music** — Softer volume, slower tempo, and calming hymns create a peaceful atmosphere throughout the liturgy.
- **Visual aids & picture missals** — Follow-along guides with pictures and simple text help everyone participate meaningfully.
- **Quiet room available** — A dedicated space to step away when needed while still participating in the Mass via livestream.
- **Sensory supports** — Fidgets, noise-reducing headphones, and visual schedules available for those who benefit from them.
- **Peer buddies & greeters** — Friendly volunteers ready to assist with seating, navigation, and participation throughout Mass.
- **Hospitality after Mass** — Join us for refreshments and fellowship in a relaxed setting following the liturgy.

## Who It's For

This Mass is especially designed for families and individuals who benefit from a calmer, sensory-friendly worship experience.

- Those with sensory sensitivities
- Neurodiverse individuals and families
- People with developmental or intellectual disabilities
- Those with communication differences
- Anyone with chronic conditions or anxiety in crowds
- Caregivers, family members, and friends

> "Come as you are — every person's presence is a gift to our parish family."

## Upcoming Dates

All Masses begin at 2:00 PM at Saint Helen Church. Mark your calendar and join us.

- **August 30, 2026** — 2:00 PM (Blessing of the Doors at 1:30 PM)
- **October 4, 2026** — 2:00 PM
- **December 27, 2026** — 2:00 PM
- **February 28, 2027** — 2:00 PM
- **May 23, 2027** — 2:00 PM
- **August 29, 2027** — 2:00 PM

## Accessibility Updates Coming Soon

This summer, we are excited to share that automatic doors will be added to the front doors of the church and the doors leading into Burke Hall to help make our parish even more accessible and welcoming for all.

**Blessing of the Doors — Sunday, August 30, 2026 · 1:30 PM.** Join us for a special blessing before the Inclusive Mass begins. We hope you can be part of this joyful occasion!

## Stay Connected

If you would like to receive updates about Inclusive Masses, ministry events, and future opportunities, please [sign up for our mailing list](https://my.sainthelen.org/OnlineReg/3218).

## Questions?

We'd love to hear from you. Whether you have questions about the Mass, want to get involved as a volunteer, or need more information, please reach out to **Maria Auricchio** at [mauricchio@sainthelen.org](mailto:mauricchio@sainthelen.org) or 908-232-1214.
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "marriage",
    title: "World Marriage Day",
    summary:
      "Celebrating the gift of marriage and the love that strengthens our families and community.",
    introBlocks: [
      {
        kind: "button_group",
        header: {
          eyebrow: "February 8th",
          heading: "World Marriage Day",
          subheading:
            "Celebrating the gift of marriage and the love that strengthens our families and community.",
        },
        items: [
          {
            label: "Getting Married at Saint Helen",
            href: "/sacraments/marriage",
            variant: "primary",
          },
          { label: "Pre-Cana Marriage Preparation", href: "/pre-cana", variant: "secondary" },
        ],
      },
    ],
    md: `
To commemorate World Marriage Day, we encourage you and your spouse to explore [articles and conversation starters](https://foryourmarriage.org) that can help deepen your relationship. Whether you've been married for one year or fifty, there's always more to discover about each other.

## At-Home Date Ideas

Want to celebrate your marriage, but it's hard to get out of the house? Here are some fun at-home date ideas!

- **Cozy Movie Night Upgrade** — Pick a movie you both love (or take turns choosing favorites from childhood). Pop special popcorn on the stove, add "movie theater" candy you don't share with the kids, dim the lights, and cuddle on the couch. Keep phones away for real conversation during or after.
- **Candlelit Takeout Dinner** — Order your favorite takeout or make a quick upgraded meal (like a simple charcuterie board or fancy sandwiches). Set the table nicely with candles, play soft music, and eat slowly without kid interruptions. Dress up a little if you want to feel fancy.
- **Board Game or Card Game Night** — Pull out a two-player game (like Scrabble, Jenga, Uno, or a couples-specific one). Add a fun twist: loser makes breakfast tomorrow or gives a back rub. It's lighthearted competition that often leads to laughs and good talks.
- **Living Room Picnic** — Spread a blanket on the floor, add pillows and blankets for a cozy fort vibe, and enjoy snacks or dessert (think indoor s'mores or fruit with chocolate). Light candles, play quiet music, and chat or stargaze through a window if you can.
- **Dessert & Deep Conversation** — Make or buy a treat (brownies, ice cream sundaes, etc.), pour favorite drinks (coffee, tea, or wine if you like), and use conversation prompts like "What's one thing you love about our life right now?" or reminisce with old photos.
- **Puzzle or Lego Building** — Work on a puzzle (keep it small or medium so it finishes in one night) or build something fun like a Lego set. It's relaxing side-by-side time that doesn't require constant talking but still feels connected.
- **Backyard or Porch Hangout** — If weather allows, sit outside with a fire pit, hot cocoa, or drinks. Stargaze, listen to a playlist of "your" songs, or just enjoy the quiet. Baby monitor on for easy escape if needed.
- **Massage Exchange** — Take turns giving shoulder or back massages with lotion or oil. Add dim lights, relaxing music, or a warm bath together if you have time and energy. A super low-key way to unwind and feel close.
- **Cook or Bake Together** — Try a fun recipe like homemade pizza, sushi rolls, or late-night cookies. Put on music, sip something nice, and enjoy the teamwork in the kitchen. Keep it easy — no gourmet pressure.
- **Playlist & Dance Party** — Create or play a shared playlist of songs from your dating days. Slow dance in the living room, share memories tied to each track, or just cuddle and listen together.

## Celebrate Your Marriage

No matter how you choose to celebrate, what matters most is taking time to appreciate the gift of your spouse and the love you share. Explore [more marriage resources](https://foryourmarriage.org).
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "more",
    title: "Programs & Activities",
    summary:
      "Find your place at Saint Helen — programs and ministries for kids, youth, adults, and families, plus your next step on the discipleship journey.",
    introBlocks: [
      {
        kind: "button_group",
        header: {
          eyebrow: "Find Your Place",
          heading: "Programs & Activities",
          subheading:
            "Quick links to get started — or scroll to browse programs by life stage.",
        },
        items: [
          { label: "I'm New", href: "/im-new", variant: "primary" },
          { label: "Mass Times", href: "/mass", variant: "secondary" },
          { label: "Give", href: "/give", variant: "secondary" },
          { label: "Events", href: "/events", variant: "secondary" },
        ],
      },
    ],
    md: `
## Stay Connected

Join the community for weekly updates, event notifications, and spiritual encouragement — [subscribe to our weekly email](/p/subscribe) or text **CONNECT** to 908-860-8444.

## Your Discipleship Journey

Wherever you are in your walk with God, there's a next step for you: **Discover → Grow → Send**. [Explore your path](/p/path).

## Kids & Youth

**Sunday children's programs:**

- [Kids Corner (ages 2–5)](/formation/kids-corner) in Meaney Hall
- [Children's Liturgy of the Word (Grades 1–4)](/ministries/childrens-liturgy-of-the-word) at the 10am Mass
- Sunday Gospel Alive in Me — GAIM (Grades 5–8), bi-monthly at the 12pm Mass

**Religious Education:** [Programs for Grades 1–10](/p/religious-education), including [Children (Grades 1–4)](/formation/children), [Middle School (Grades 5–8)](/formation/middle-school), and [Confirmation](/formation/confirmation).

**Youth Ministry:** Interactive nights, service, and retreats for high-school teens. [Learn more](/youth-ministry).

## Families

- **[Catholic Families Connect](/ministries/catholic-families-connect)** — connects families with young children through events and service projects.
- **[Elementary Families Together](/ministries/eft)** — activities for families with children in grades 1–4, including Harvest Fest and service projects.

## Adults

- **[Called and Gifted](/called)** — a discernment program to discover your unique purpose and mission.
- **[Cornerstone Retreats](/ministries/cornerstone)** — nearly 1,700 parishioners have attended this 26-hour faith-strengthening retreat since its inception.
- **[Walking With Purpose](/wwp)** — women's Scripture study meeting Thursday evenings and Friday mornings.
- **[LifeLines](/lifelines)** — small groups organized around shared interests and activities while growing in faith together.
- **[ChristLife](/christlife)** — discover, follow, and share Jesus Christ.

## Support & Outreach

Browse [all ministries](/ministries) — including [Care Ministry](/ministries/care-ministry), [Funeral Support](/ministries/funeral-support), [Ageless Senior Ministry](/ministries/ageless), and the [Christ Centered Crochet Club (4C's)](/ministries/4cs).

## Resources

- [Word Among Us daily meditations](http://wau.org/meditations/current/)
- [Formed.org](https://sainthelen.formed.org/)
- [Daily readings (USCCB)](http://www.usccb.org/bible/readings/)
- [Prayer requests](/p/prayers)
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "path",
    title: "Discipleship Path",
    summary:
      "Join us on a discipleship journey — Discover, Grow, and Send. Find the perfect next step wherever you are on your walk with God.",
    md: `
## Join Us on a Discipleship Journey

Jesus wants to have a relationship with you and has given you gifts through the Holy Spirit to share His love with the world. Wherever you are on your journey toward becoming a missionary disciple, we'll support you at your own pace. The path may present challenges — keep going. We're walking with you.

## Discover — "Come and See" (John 1:46)

This initial phase focuses on discovering a relationship with Jesus Christ through:

- [Sunday Worship](/im-new)
- [LifeLines](/lifelines)
- [Discovering Christ](/christlife)
- [Cornerstone Retreats](/ministries/cornerstone)
- [Walking With Purpose](/wwp)
- [OCIA — Order of Christian Initiation of Adults](/p/become-catholic)

## Grow — "Follow Me" (Matthew 9:9)

For those committed to discipleship, growth opportunities include:

- [Sunday Worship](/im-new)
- [Growing in Faith](/grow)
- [LifeLines](/lifelines)
- [Cornerstone Retreats](/ministries/cornerstone)
- [Spiritual Direction](/p/spiritual-direction)
- [Manresa Retreat](/p/manresa)

## Send — "Go and Make Disciples" (Matthew 28:19)

At this stage, disciples share Christ's love with others through:

- [Called & Gifted](/called)
- [Spiritual Direction](/p/spiritual-direction)

## Not Sure Where to Begin?

Everyone's journey is different. If you're not sure which step is right for you, [reach out and we'll help you find the perfect next step](/contact) in your discipleship journey.
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "subscribe",
    title: "Subscribe to Our Weekly Email",
    summary:
      "Weekly updates, event notifications, and spiritual encouragement from the Parish Community of Saint Helen — by email or text.",
    introBlocks: [
      {
        kind: "button_group",
        header: {
          eyebrow: "Stay Connected",
          heading: "Subscribe to Our Weekly Email",
          subheading:
            "Weekly updates, event notifications, and spiritual encouragement delivered straight to you.",
        },
        items: [
          {
            label: "Text CONNECT to 908-860-8444",
            href: "sms:9088608444&body=CONNECT",
            variant: "primary",
          },
          {
            label: "Communications Portal",
            href: "https://comms.sainthelen.org",
            variant: "secondary",
          },
        ],
      },
    ],
    md: `
## Two Easy Ways to Subscribe

- **Text** the word **CONNECT** to **908-860-8444** and follow the prompts.
- **Online** — visit our [communications portal](https://comms.sainthelen.org) to subscribe and manage your email and text preferences.

Questions? Call the parish office at 908-232-1214 (Monday–Friday, 9:30am–5:00pm) and we'll be glad to help you get set up.
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "religious-education",
    title: "Religious Education",
    summary:
      "Connecting young people with Jesus Christ through the Bible and Catholic Tradition — programs for Grades 1–10 plus family sacrament preparation.",
    md: `
The Saint Helen Religious Education program aims to connect young people with Jesus Christ through teachings from the Bible and Catholic Tradition. The program emphasizes community, family faith growth, and the parish mission of worshipping God, making disciples, and serving others. Parents can indicate accommodation needs during registration — all information remains confidential.

## Religious Education Programs

- [Religious Education Registration](/p/reled-registration)
- [Family Sacrament Group Information](https://sainthelen.org/wp-content/uploads/2024/06/FINAL_Family_Sacrament_Group_Information__website_description.docx)
- [Children (Grades 1–4)](/formation/children)
- [Middle School (Grades 5–8)](/formation/middle-school)
- [Confirmation](/formation/confirmation)

## Volunteer Ministers

Religious Education volunteers are essential to the success of the program. All teachers and volunteers must complete the Protecting God's Children workshop and submit a volunteer application that includes a criminal background check.

- [About Protecting God's Children](/p/pgc)
- [Protecting God's Children — Virtus Online](https://virtusonline.org/virtus/)
- [Empowering God's Children](/formation/empowering-gods-children)

Questions? Call the parish office at 908-232-1214, Monday–Friday, 9:30am–5:00pm.
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "reled-registration",
    title: "Religious Education Registration 2026–27",
    summary:
      "Registration for the 2026–2027 Religious Education year opens Wednesday, June 17, 2026 at 10:00am. Fees, grade-level links, and contacts.",
    md: `
Registration for the 2026–2027 school year opens on **Wednesday, June 17, 2026, at 10:00am**. Parents must have a MySaintHelen parishioner account to register. New families can get started at [I'm New](/im-new).

Programs and schedules are available on the [Religious Education page](/p/religious-education).

## How Registration Works

Registration is organized by grade level with separate links. Students registered in 2025–2026 will receive email notifications on June 17 with direct links, which become active at 10:00am that day.

## Registration Links

- [Children Missing Sacraments 2026–2027](https://my.sainthelen.org/OnlineReg/3214)
- [Grades 1–2 Registration](https://my.sainthelen.org/OnlineReg/3187)
- [Grades 3–4 Registration](https://my.sainthelen.org/OnlineReg/3188)
- [Grades 5–8 Registration](https://sainthelen.tpsdb.com/OnlineReg/3182)
- [Confirmation Grades 9–10](https://sainthelen.tpsdb.com/OnlineReg/3185)

## Fees

- Base fee per child: **$175.00**
- After August 1, 2026: **$200.00** per child
- After September 1, 2026: **$225.00** per child
- Additional sacramental and retreat fees apply to certain programs.

## Special Accommodations

Families with children requiring support or accommodations can contact staff directly or complete the relevant registration form questions; all information remains confidential.

## Contacts

- **Nicole Murphy**, Director of Religious Education, Grades 1–4 — 908-232-1214 ext. 116
- **Michael Fusco**, Director of Religious Education, Grades 5–10 — 908-265-2169
- **MaryAnn Gerbino**, Religious Education Assistant — 908-232-1214 ext. 109
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "lifeline-resources",
    title: "LifeLine Resources",
    summary:
      "Weekly guides, video series, podcast studies, and books for LifeLines small groups at Saint Helen.",
    md: `
## Weekly Guide for LifeLines

- [A Wilderness Within (Lent Guide)](https://sainthelen.org/wp-content/uploads/2026/02/Lent-2026-Wilderness-Within-Leader-Guide.pdf)
- [Baptism of the Lord — 1/11](https://sainthelen.org/wp-content/uploads/2026/01/01_11_2026_The_Baptism_of_the_Lord.pdf)
- [2nd Sunday of Ordinary Time — 1/18](https://sainthelen.org/wp-content/uploads/2026/01/01_18_2026_Second_Sunday_in_Ordinary_Time.pdf)
- [3rd Sunday of Ordinary Time — 1/25](https://sainthelen.org/wp-content/uploads/2025/12/01_25_2026_Third_Sunday_in_Ordinary_Time.pdf)
- [4th Sunday of Ordinary Time — 2/1](https://sainthelen.org/wp-content/uploads/2025/12/02_01_2026_Fourth_Sunday_in_Ordinary_Time.pdf)
- [5th Sunday of Ordinary Time — 2/8](https://sainthelen.org/wp-content/uploads/2025/12/02_08_2026_Fifth_Sunday_in_Ordinary_Time.pdf)
- [6th Sunday of Ordinary Time — 2/15](https://sainthelen.org/wp-content/uploads/2025/12/02_15_2026_Sixth_Sunday_in_Ordinary_Time.pdf)

## Wild Goose Series: Holy Spirit

- [Video series](https://www.youtube.com/playlist?list=PLE6t-PqUvPEemaneqIWybKUn4j8olfe9h)
- [Small group guide](https://uploads.weconnect.com/mce/17e89c359872f5659b5d7892ba8e52821c93eef3/Revive/CompleteStudyGuide__TheWildGoose.pdf)

## Wild Goose Series: Metanoia

You can set up a free account with Wild Goose TV to access this series.

- [Video series](https://wildgoose.tv/programs/collection-dyy7fbd6cie?category_id=23145)
- [Small group guide](https://uploads.weconnect.com/mce/17e89c359872f5659b5d7892ba8e52821c93eef3/StudyGuides/MetanoiaStudyGuide.pdf)

## Abiding Together Podcast Studies

- [Apostolic Letters](https://www.abidingtogetherpodcast.com/apostolic-letters)
- [Identity of a Woman series](https://www.abidingtogetherpodcast.com/studies-the-identity-of-a-woman)
- [Book studies](https://www.abidingtogetherpodcast.com/book-studies)
- [Series](https://www.abidingtogetherpodcast.com/series)

## Diocese of Saskatoon Small Group Guides

- [Faith resources website](https://rcdos.ca/our-faith/growing-in-your-catholic-faith/faith-resources/)

## Resources on Hand at Saint Helen

- [Genesis by Allen Hunt — book + video series](https://www.youtube.com/playlist?list=PLpgSmbUWbiIkCMImANn6LWm8KDgsGkD8h) (4 copies of the book)
- [I Heard God Laugh by Matthew Kelly — study guide](https://s3-us-west-2.amazonaws.com/files.dynamiccatholic.com/home/studyguides/StudyGuide_IHGL.pdf) (8 copies of the book)
- [Holy Moments by Matthew Kelly — discussion guide](https://olastrafford.org/wp-content/uploads/Holy-Moments-Discussion-Guide.pdf) (7 copies of the book)
- [Be My Witness by Renew International](https://www.renewintl.org/be-my-witness)

## Questions?

Have a question about LifeLines, or need help finding material? Contact **Maria Auricchio** at [mauricchio@sainthelen.org](mailto:mauricchio@sainthelen.org) or 908-232-1214 (Monday–Friday, 9:30am–5:00pm).
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "walk-with-one",
    title: "Walk With One",
    summary:
      "An initiative of the National Eucharistic Congress — accompany one person toward a deeper experience of God's transformative love.",
    introBlocks: [
      {
        kind: "button_group",
        header: {
          eyebrow: "An Initiative of the National Eucharistic Congress",
          heading: "Walk With One",
          subheading:
            "Will you walk with one? Would you like someone to walk with you?",
        },
        items: [
          {
            label: "Walk With One Form",
            href: "https://sainthelen.typeform.com/to/hilotX7A",
            variant: "primary",
          },
          {
            label: "LifeLines at Saint Helen",
            href: "https://lifelines.sainthelen.org/",
            variant: "secondary",
          },
        ],
      },
    ],
    md: `
Throughout the Gospels, Jesus invites people one by one into relationship with Him. He meets them where they are, listens to their stories, and accompanies them on their journey of faith. Today, He invites us to do the same — to "walk with one" person toward a deeper experience of God's transformative love.

Whether you feel called to accompany someone else or would welcome having someone walk alongside you in faith, we're here to help make that connection through the [Walk With One form](https://sainthelen.typeform.com/to/hilotX7A).

## The Four Stages

Not sure where to begin? This simple four-stage heart-to-heart approach will guide you in accompanying others on their faith journey:

- [Identify](https://sainthelen.org/wp-content/uploads/2025/04/ww1pray.pdf)
- [Intercede](https://sainthelen.org/wp-content/uploads/2025/04/WW1-Intercede.pdf)
- [Connect](https://sainthelen.org/wp-content/uploads/2025/04/WW1-Connect.pdf)
- [Invite](https://sainthelen.org/wp-content/uploads/2025/04/WW1-Invite.pdf)

## Walk With One Novena — Beginning Pentecost

Join us in the nine-day prayer novena starting on Pentecost. [Download your copy](https://sainthelen.org/wp-content/uploads/2025/05/pentecost-novena-booklet.pdf-8.5-x-11-in-3.pdf) and pray along with our community.

## Prayer

> Gracious Father, to walk with another is to journey, hand-in-hand, with you. Grant me your wisdom as I contemplate the journey that lies before me. Help me to see all of the paths that mark my trail. Guide me toward understanding as I reflect on my heart and conscience, discerning the steps You call me to take. Loving Father, grant me the grace and courage to step beyond my comfort zone and walk boldly into Your presence. In Jesus' name we pray. Amen.

## Ways to Invite

- [Worship](/im-new)
- [Serve](/ministries)
- [Grow](/p/path)

## National Eucharistic Congress

Learn more about the Walk With One initiative at the [National Eucharistic Congress website](https://www.eucharisticrevival.org/walk-with-one).
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "connect-survey",
    title: "Parish Connection Survey",
    summary:
      "Help parish leadership understand our community's needs — a brief survey for registered parishioners.",
    introBlocks: [
      {
        kind: "button_group",
        header: {
          eyebrow: "We Want to Hear From You",
          heading: "Parish Connection Survey",
          subheading:
            "A brief survey to help our leadership understand community needs and improve pastoral support.",
        },
        items: [
          {
            label: "Take the Survey",
            href: "https://sainthelen.typeform.com/to/qRKIXZcx",
            variant: "primary",
          },
        ],
      },
    ],
    md: `
We invite all registered parishioners to complete this brief survey. Your responses help our parish leadership understand the needs of our community and improve how we support you pastorally.

The survey takes just a few minutes. Thank you for helping us serve you better!

[Take the Parish Connection Survey](https://sainthelen.typeform.com/to/qRKIXZcx)
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "fest",
    title: "Saint Helen Fest",
    summary:
      "An afternoon of fellowship, food, music, and fun for the whole parish family on the Saint Helen grounds.",
    md: `
**Date:** Sunday, September 28 · 1:00–5:00pm
**Rain date:** Sunday, October 5 · 1:00–5:00pm

Last year more than 700 members of our parish family gathered to celebrate — and this year will be even bigger.

## Food & Beverages

- **Parish Grill** — volunteer-led grilling station with hamburgers, hot dogs, and chicken sandwiches.
- **Food truck favorites** — wood-fired pizza made fresh on-site and the New Jersey Delicious Ice Cream Truck.
- **Beer Garden by Lions Roar Brewing** — 21+ only; cash and credit accepted.

## Entertainment & Activities

- **Live music** — band performance throughout the afternoon.
- **Kids Zone** — bounce houses, face painting, games, and activities.
- **Community connection** — meet fellow parishioners, connect with new families, and enjoy the parish grounds.

## Get Involved

- [RSVP](https://sainthelen.tpsdb.com/OnlineReg/3081)
- [Volunteer](https://sainthelen.tpsdb.com/OnlineReg/3108)
- [Sponsor](/p/sponsor)

Individual and family sponsorships are welcome. Donations are also accepted to support parish ministries.
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "sponsor",
    title: "Sponsor Saint Helen Fest",
    summary:
      "Support Saint Helen Fest as a Platinum, Gold, Silver, or Bronze sponsor and help nourish our community.",
    md: `
## Thank You for Considering Being a Sponsor

Saint Helen Fest is a beautiful time to gather and celebrate all that Saint Helen is. It is a time for fellowship, friendship, good food, entertainment, and an invitation to grow in community!

Please consider being a sponsor for this event using the form below. Your support will not only help fund this festive day, but also nourish our community.

[Sponsorship Form](https://sainthelen.tpsdb.com/OnePageReg/1975)

## Sponsorship Levels

- **Platinum** — $3,000
- **Gold** — $2,000
- **Silver** — $1,000
- **Bronze** — $500
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "presence",
    title: "Presence: The Mystery of the Eucharist",
    summary:
      "A three-part series on the truth and beauty of Christ's real presence in the Eucharist — wine & cheese, video presentation, and adoration.",
    md: `
Join us for three Wednesday sessions following Corpus Christi that examine the truth and beauty of Christ's real presence in the Eucharist.

Each evening begins with wine and cheese at 6:30pm, followed by chapel prayer and a video presentation at 7:00pm, and concludes with adoration in the church starting at 8:00pm.

## Session Schedule

- **Wednesday, June 14** — God Is With Us
- **Wednesday, June 21** — The Story of the Eucharist
- **Wednesday, June 28** — Bread for the Journey

Questions? Call the parish office at 908-232-1214 (Monday–Friday, 9:30am–5:00pm).
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "advent",
    title: "Advent & Christmas at Saint Helen",
    summary:
      "Christmas Eve and Christmas Day Mass times, seasonal events, and ways to give at Saint Helen.",
    md: `
## Celebrate Christmas at Saint Helen

### Christmas Schedule

- **Christmas Eve:** 4pm · 6pm · 9pm · 12 midnight
- **Christmas Day:** 10am · 12pm

All Masses will be held in the Church. Seating is first come, first served. Overflow seating will be available in the Chapel. The 4:00pm Mass will be live-streamed in the Chapel and Meaney Hall.

[Make a One-Time Christmas Gift](https://my.sainthelen.org/Give/christmas)

For the regular weekly schedule, see [Mass times](/mass).
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "lent",
    title: "Holy Week & Easter at Saint Helen",
    summary:
      "Walk with Jesus through His Passion, Death, and Resurrection — Holy Week and Easter schedule and mission at Saint Helen.",
    md: `
Walk with Jesus through His Passion, Death, and Resurrection. Join us as we celebrate the most sacred days of the liturgical year.

The full Holy Week and Triduum schedule is published here each season — check back as Lent begins, or see the current [Mass times](/mass) and [events calendar](/events).

For daily prayer through the season, explore [LifeLines small groups](/lifelines) and the [LifeLine resources library](/p/lifeline-resources).
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "easter-scroll",
    title: "Easter Memorial Scroll",
    summary:
      "In loving memory — the Parish Community of Saint Helen's Easter Memorial Scroll.",
    md: `
## In Loving Memory

> "I am the resurrection and the life. Whoever believes in me, even though they die, will live." — John 11:25

**Parish Community of Saint Helen — Easter 2026**

The Easter Memorial Scroll remembers loved ones of our parish family in the prayers of the Easter season.
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "current-series",
    title: "Message Series",
    summary:
      "Follow along with the current homily message series at Saint Helen — weekly themes, readings, and discussion guides for every age.",
    md: `
## Mountain Do's — Sermon on the Mount

This three-week series explores Jesus' Sermon on the Mount (February 1, 8, and 15), unveiling a radical blueprint for life in God's kingdom that emphasizes heart-deep obedience rather than surface-level rule-following.

### Series Themes

- **The Mountain** — Jesus as the new Moses
- **Blessed** — upside-down kingdom values
- **Salt & Light** — called to shine and preserve
- **Heart-Deep** — beyond external obedience

### Weekly Breakdown

- **Week 1 — "Blessed Beginnings" (February 1):** The Beatitudes. God doesn't choose the powerful — he chooses the humble. Divine favor extends to those society overlooks.
- **Week 2 — "Salty Lights" (February 8):** Matthew 5:13–16. Believers *are* salt and light, called to preserve and illuminate through good works and service.
- **Week 3 — "Fulfilled Fire" (February 15):** Jesus' intensification of the Law — moving beyond external compliance toward internal transformation of the heart.

### Guides for Every Age

Each series includes age-specific discussion guides — for children (PreK–Grade 2), elementary students (Grades 1–4), middle schoolers (Grades 5–8), Confirmation candidates (Grades 9–10), high school youth, and adult small groups — plus conversation starters for families.

Guides are shared each week in the [bulletin](/bulletin) and through [LifeLines](/lifelines).
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "cgteam",
    title: "Called & Gifted Team Resources",
    summary:
      "Prayer guides, mentor playbooks, interview outlines, discernment worksheets, and leader guides for the Called & Gifted team.",
    md: `
Resources for the Called & Gifted team. New to Called & Gifted? Start at the [program page](/called).

## Prayers

- [Download the Novena](https://sainthelen.org/wp-content/uploads/2021/10/Novena.pdf)

## Mentor Playbook

- [Download the Mentor Playbook](https://sainthelen.org/wp-content/uploads/2021/10/Mentor-Playbook-10082021.pdf)

## Resource Links

- [Siena's Interview Outline](https://sainthelen.org/wp-content/uploads/2023/10/Gifts-Interview-2.0-outline-2021-1.pdf)
- [Siena's Interview Summary](https://sainthelen.org/wp-content/uploads/2023/10/Interview-Summary-Sheet-updated-1.pdf)
- [Charism Clusters](https://sainthelen.org/wp-content/uploads/2023/10/Charism-Clusters-B.pdf)
- [Discernment Plan](https://sainthelen.org/wp-content/uploads/2023/10/My-Discernment-Plan-.pdf)
- [Small Group Leader Notes from Siena](https://sainthelen.org/wp-content/uploads/2023/10/3.Leader-Notes-September-2021.pdf)
- [Discerning Together Worksheet](https://sainthelen.org/wp-content/uploads/2023/10/Discerning-Together.pdf)
- [Experiment Log](https://sainthelen.org/wp-content/uploads/2023/10/Experiment-Log.pdf)

## Step 1 Leader Guides

- [Week 1 Guide](https://sainthelen.org/wp-content/uploads/2023/10/CG_LeaderGuide1.pdf)
- [Week 2 Guide](https://sainthelen.org/wp-content/uploads/2023/10/CG_LeaderGuide2.pdf)
- [Week 3 Guide](https://sainthelen.org/wp-content/uploads/2023/10/CG_LeaderGuide3.pdf)
- [Week 4 Guide](https://sainthelen.org/wp-content/uploads/2023/10/CG_LeaderGuide4.pdf)
- [Week 5 Guide](https://sainthelen.org/wp-content/uploads/2023/10/CG_LeaderGuide5.pdf)

## Step 3 Leader Guides

- [Session 1 Guide](https://sainthelen.org/wp-content/uploads/2022/05/Called-and-Gifted-Step-3-Session-1-Leader-Guide.pdf)
- [Session 1 Supplement A: What Is Discernment?](https://sainthelen.org/wp-content/uploads/2022/01/Leaderrs-Resource-What-is-Discernment1.pdf)
- [Session 1 Supplement B: Discernment Process](https://sainthelen.org/wp-content/uploads/2022/01/Discernment-Process.pdf)
- [Session 2 Guide](https://sainthelen.org/wp-content/uploads/2022/05/Called-and-Gifted-Step-3-Session-2-Leader-Guide.pdf)
- [Session 3 Guide](https://sainthelen.org/wp-content/uploads/2022/05/Called-and-Gifted-Step-3-Session-3-Leader-Guide.pdf)
- [Session 4 Guide](https://sainthelen.org/wp-content/uploads/2022/05/Called-and-Gifted-Step-3-Session-4-Leader-Guide.pdf)
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "mens-cornerstone-team-candidates",
    title: "Men's Cornerstone Team & Candidates",
    summary:
      "Please keep the members of our Men's Cornerstone Team and Retreat Candidates in your prayers.",
    md: `
Please keep members of our Men's Cornerstone Team and Retreat Candidates in your prayers.

## Team

- Eric Fisher
- Vince Flores
- Rich McKinley
- Kevin Morris
- Januel Nalupta
- Paul Nieves
- Dan Nott
- Mickey Peare
- Daniel Tivenan
- Robimon Varughese

## Candidates

- George Acosta
- Martin Barotilla
- Luis Calimano
- Mark Del Col
- Michael Fossaceca
- John Gorman
- Thomas Karmol
- Johnathan Kraus
- Tom Park
- Drew Patterson
- Mike Pribush
- Joseph Prusik
- Thomas Rachel
- Richard Valente
- Jerry Vella
- Brendan Ward
- Martin Ward

Learn more about [Cornerstone retreats](/ministries/cornerstone).
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "summer-discipleship-discovery-series",
    title: "Summer Discipleship Discovery Series",
    summary:
      "Three adult discipleship series for the summer — the Manresa Retreat, Presence: The Mystery of the Eucharist, and a Genesis small-group study.",
    md: `
## Embark on a Journey of Spiritual Growth

This summer, the Parish Community of Saint Helen offers three adult discipleship series designed to provide a deeper understanding of faith, community, and relationship with God. These programs welcome both longtime parishioners and those seeking spiritual growth.

### Manresa Retreat

**Manresa Retreat: 12 Weeks of Daily Prayer** begins Sunday, June 11. This transformative spiritual journey adapts to your daily schedule. Using the guide *Finding Christ in the World: A Twelve Week Ignatian Retreat in Everyday Life*, participants explore a deeper connection to God and discover the divine presence in everyday moments. [Learn more](/p/manresa).

### Presence: The Mystery of the Eucharist

Starting Wednesday, June 14, this three-part series examines the Eucharist's beauty and significance. Weekly gatherings include wine, cheese, prayer, and video presentations, concluding with a holy hour in the church. [Learn more](/p/presence).

### Small Groups: Genesis

Beginning the week of July 9, this small-group journey studies Genesis, the Bible's first book, through life-changing encounters with the God of Creation. [Learn more](/lifelines).
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "synod-recap",
    title: "Synod Recap",
    summary:
      "A summary and report of the 2022 Synod — what we sent to the Archdiocese and what we heard from you.",
    md: `
## Synod Summary & Report

As part of the 2022 Synod, our parish gathered feedback from across the community. This page collects what we sent to the Archdiocese along with what we heard from you.

For questions about the Synod process, call the parish office at 908-232-1214 (Monday–Friday, 9:30am–5:00pm).
`,
  },
  // ────────────────────────────────────────────────────────────────────
  {
    slug: "ad-lead",
    title: "Adult Discipleship Ministry Lead",
    summary:
      "Leader guide and resources for Adult Discipleship Ministry leads at Saint Helen.",
    md: `
## Adult Discipleship Leaders Guide

- [Leader guide, version 2](https://sainthelen.org/wp-content/uploads/2025/08/Adult-Discipleship-Ministry-Guide-v2.pdf) — includes videos on the database and workroom computer
- [Leader resources](/p/lifeline-resources)

Questions? Call the parish office at 908-232-1214 (Monday–Friday, 9:30am–5:00pm).
`,
  },
];

/**
 * Redirects to merge. Entries here overwrite an existing row with the same
 * `from` (that's deliberate — /stewardship-spotlight's target is a user
 * decision from 2026-07-28). Prefix rules (from ending in "/*") require the
 * middleware prefix support shipped in the same commit as this script.
 */
const REDIRECTS: Redirect[] = [
  // NOTE (Wave 18.1): CMS pages serve at the ROOT URL — no "/<slug> →
  // /p/<slug>" entries here. A redirect from a published page's own URL
  // would shadow the app/(site)/[slug] route. Aliases and retired URLs only.
  { from: "/youth", to: "/youth-ministry", permanent: true },
  { from: "/stewardship-spotlight", to: "/blog?category=stewardship", permanent: true },
  { from: "/stewardship-spotlight/*", to: "/blog?category=stewardship", permanent: false },
  { from: "/small-groups", to: "/lifelines", permanent: true },
  { from: "/support-outreach", to: "/ministries", permanent: true },
  { from: "/sunday-experience", to: "/ministries", permanent: true },
  { from: "/family-activities", to: "/ministries", permanent: true },
  { from: "/youth-activities", to: "/ministries", permanent: true },
  { from: "/adult-activities", to: "/ministries", permanent: true },
  { from: "/christmas", to: "/advent", permanent: false },
  { from: "/old-synod", to: "/synod-recap", permanent: true },
  { from: "/adlut-faith-leader", to: "/ad-lead", permanent: true },
  { from: "/inclusive-mass-mailing-list", to: "https://my.sainthelen.org/OnlineReg/3218", permanent: false },
  { from: "/message-series", to: "/current-series", permanent: true },
  { from: "/message-series/*", to: "/current-series", permanent: true },
  { from: "/stream", to: "/live", permanent: true },
  { from: "/lifelines-resources", to: "/lifeline-resources", permanent: true },
];

/**
 * Stale redirects to REMOVE. The pre-Wave-16 standalone-pages import added
 * "/<slug> → /p/<slug>" rows for the 12 standalone ministries; Wave 16 then
 * built real root routes at those URLs, but the redirects were never
 * deleted — so middleware 308s them to the old /p/ drafts and the real
 * routes are unreachable. Middleware matches before routing.
 */
const REMOVE_FROMS = [
  "/adoration", "/basketball", "/called", "/christlife", "/grow",
  "/lifelines", "/music", "/pre-cana", "/vbs", "/wwp",
  "/young-adult-ministry", "/youth-ministry",
];

async function importPages(): Promise<number> {
  let written = 0;
  for (const seed of SEEDS) {
    const html = mdToSafeHtml(seed.md);
    const bodyBlocks = htmlToBlocks(html);
    const blocks = [...(seed.introBlocks ?? []), ...bodyBlocks];

    if (DRY_RUN) {
      console.log(`  [dry] /p/${seed.slug.padEnd(38)} ${blocks.length} blocks`);
      continue;
    }

    const [row] = await db
      .insert(pages)
      .values({
        slug: seed.slug,
        title: seed.title,
        summary: seed.summary,
        status: "published",
      })
      .onConflictDoUpdate({
        target: pages.slug,
        set: {
          title: seed.title,
          summary: seed.summary,
          status: "published",
          updatedAt: new Date(),
        },
      })
      .returning({ id: pages.id });
    if (!row) throw new Error(`pages upsert returned no row for ${seed.slug}`);

    await db
      .delete(pageSections)
      .where(and(eq(pageSections.parentKind, "page"), eq(pageSections.parentId, row.id)));
    if (blocks.length > 0) {
      await db.insert(pageSections).values(
        blocks.map((p, i) => ({
          parentKind: "page" as const,
          parentId: row.id,
          position: i,
          kind: p.kind,
          payload: p,
        })),
      );
    }
    written++;
    console.log(`  ✓ /p/${seed.slug.padEnd(38)} ${blocks.length} blocks`);
  }
  return written;
}

async function mergeRedirects(): Promise<void> {
  const [settings] = await db
    .select({ redirects: siteSettings.redirects })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!settings) throw new Error("site_settings singleton missing");

  const byFrom = new Map<string, Redirect>(
    (settings.redirects ?? []).map((r) => [r.from, r]),
  );
  let added = 0;
  let changed = 0;
  let removed = 0;
  for (const r of REDIRECTS) {
    const existing = byFrom.get(r.from);
    if (!existing) added++;
    else if (existing.to !== r.to || existing.permanent !== r.permanent) changed++;
    byFrom.set(r.from, r);
  }
  for (const from of REMOVE_FROMS) {
    if (byFrom.delete(from)) removed++;
  }
  const merged = Array.from(byFrom.values()).sort((a, b) => a.from.localeCompare(b.from));

  if (DRY_RUN) {
    console.log(`  [dry] redirects: +${added} new, ${changed} updated, -${removed} stale (${merged.length} total)`);
    return;
  }
  await db.update(siteSettings).set({ redirects: merged }).where(eq(siteSettings.id, 1));
  console.log(`  ✓ redirects: +${added} new, ${changed} updated, -${removed} stale (${merged.length} total)`);
}

/** Fill giving settings only where currently empty — never clobber admin edits. */
async function fillGivingSettings(): Promise<void> {
  const [settings] = await db
    .select({ giving: siteSettings.giving })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  if (!settings) throw new Error("site_settings singleton missing");

  const giving: GivingSettings = settings.giving ?? {
    primaryUrl: "",
    recurringUrl: "",
    designations: [],
    seasonal: [],
  };
  let touched = false;

  if (!giving.primaryUrl?.trim()) {
    giving.primaryUrl = "https://my.sainthelen.org/give/make-a-gift";
    touched = true;
  }

  const wanted = [
    { label: "Memorial & Honor Gifts", url: "https://my.sainthelen.org/give/memorial" },
    { label: "Restricted Gifts", url: "https://my.sainthelen.org/give/restricted-gift" },
  ];
  const existingUrls = new Set((giving.designations ?? []).map((d) => d.url));
  for (const d of wanted) {
    if (!existingUrls.has(d.url)) {
      giving.designations = [...(giving.designations ?? []), d];
      touched = true;
    }
  }

  if (!touched) {
    console.log("  ✓ giving settings already populated — no change");
    return;
  }
  if (DRY_RUN) {
    console.log("  [dry] giving settings would be filled (primaryUrl + designations)");
    return;
  }
  await db.update(siteSettings).set({ giving }).where(eq(siteSettings.id, 1));
  console.log("  ✓ giving settings filled (primaryUrl + memorial/restricted designations)");
}

async function main() {
  console.log(`Wave 18 legacy-page import${DRY_RUN ? " (DRY RUN)" : ""}\n`);
  console.log("Pages:");
  const count = await importPages();
  console.log("\nRedirects:");
  await mergeRedirects();
  console.log("\nGiving settings:");
  await fillGivingSettings();
  console.log(`\n✓ Done. ${count} pages written, ${SEEDS.length} defined.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
