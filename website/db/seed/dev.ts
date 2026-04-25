/**
 * Dev-only fixture seed.
 *
 * Idempotent — every insert either conflicts on a unique key and
 * becomes a no-op, or upserts. Safe to re-run.
 *
 * Seeds the day-1 admin (mboyle@sainthelen.org), 4 staff, 8 ministries,
 * 5 events, and the weekly Mass schedule. Bulletins and seasonal
 * banners are intentionally not seeded — they require real blob assets
 * and will be exercised once the upload flow ships (Step 5).
 */

import { db } from "../index";
import { events, massTimes, ministries, staff, users } from "../schema";

const DAY_ONE_ADMIN_EMAIL = "mboyle@sainthelen.org";

export async function seedDev() {
  /* ---------- day-1 admin ----------------------------------------- */
  const [admin] = await db
    .insert(users)
    .values({
      email: DAY_ONE_ADMIN_EMAIL,
      name: "Matthew Boyle",
      role: "admin",
      phone: "+15555551234", // placeholder — update via /admin/account when SMS auth ships
      preferredAuthMethod: "email",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { role: "admin" }, // ensure role on re-run in case someone demoted locally
    })
    .returning({ id: users.id });

  console.log(`  ✓ day-1 admin (${DAY_ONE_ADMIN_EMAIL})`);

  /* ---------- staff ----------------------------------------------- */
  const staffRows = await db
    .insert(staff)
    .values([
      {
        slug: "fr-tom",
        name: "Fr. Tom Donovan",
        role: "Pastor",
        bio: "Fr. Tom has served as pastor of Saint Helen since 2019.",
        email: "frtom@sainthelen.org",
        orderingPriority: 10,
      },
      {
        slug: "fr-luis",
        name: "Fr. Luis Hernandez",
        role: "Parochial Vicar",
        email: "frluis@sainthelen.org",
        orderingPriority: 20,
      },
      {
        slug: "maria-chen",
        name: "Maria Chen",
        role: "Director of Music & Liturgy",
        email: "music@sainthelen.org",
        orderingPriority: 30,
      },
      {
        slug: "paul-rivera",
        name: "Paul Rivera",
        role: "Business Manager",
        email: "business@sainthelen.org",
        orderingPriority: 40,
      },
    ])
    .onConflictDoNothing({ target: staff.slug })
    .returning({ id: staff.id, slug: staff.slug });

  console.log(`  ✓ staff (${staffRows.length} inserted / already present)`);

  /* ---------- ministries ------------------------------------------ */
  const ministryRows = await db
    .insert(ministries)
    .values([
      {
        slug: "choir",
        name: "Parish Choir",
        tagline: "Lead the 10:30 Mass in song.",
        description:
          "Our parish choir sings at the 10:30 Sunday Mass and major feasts. Rehearsals Thursdays at 7 PM. No audition — just come sing.",
        audiences: ["adults", "teens"],
        category: "music",
        matchmakerTags: ["music", "worship", "community"],
        meetingCadence: "Thursdays, 7:00 PM",
        contactEmail: "music@sainthelen.org",
        status: "published",
        orderingPriority: 10,
      },
      {
        slug: "knights-of-columbus",
        name: "Knights of Columbus",
        tagline: "Catholic men in service to parish and community.",
        description:
          "Charity, unity, fraternity, and patriotism. Monthly meetings and several service projects a year.",
        audiences: ["adults", "men"],
        category: "service",
        matchmakerTags: ["service", "community", "men"],
        meetingCadence: "2nd Tuesdays, 7:30 PM",
        contactEmail: "kofc@sainthelen.org",
        status: "published",
        orderingPriority: 20,
      },
      {
        slug: "rcia",
        name: "Becoming Catholic (OCIA)",
        tagline: "A welcoming path for anyone exploring the faith.",
        description:
          "Weekly sessions September through Easter. No commitment to decide — start by coming to a meeting.",
        audiences: ["adults", "newcomers"],
        category: "sacraments",
        matchmakerTags: ["formation", "newcomer", "sacraments"],
        meetingCadence: "Wednesdays, 7:00 PM (Sep–Apr)",
        contactEmail: "ocia@sainthelen.org",
        status: "published",
        orderingPriority: 30,
      },
      {
        slug: "mothers-group",
        name: "Mothers' Group",
        tagline: "Community and support for moms of all ages.",
        description:
          "Monthly gatherings, occasional retreats, and a private group chat. Babies welcome.",
        audiences: ["women", "families"],
        category: "fellowship",
        matchmakerTags: ["women", "families", "community"],
        meetingCadence: "1st Fridays, 9:30 AM",
        contactEmail: "moms@sainthelen.org",
        status: "published",
        orderingPriority: 40,
      },
      {
        slug: "youth-ministry",
        name: "Youth Ministry",
        tagline: "High-schoolers, this is your parish.",
        description:
          "Sunday night gatherings, service trips, and an annual retreat. Bring a friend.",
        audiences: ["teens"],
        category: "formation",
        matchmakerTags: ["teens", "formation", "community"],
        meetingCadence: "Sundays, 7:00 PM",
        contactEmail: "youth@sainthelen.org",
        status: "published",
        orderingPriority: 50,
      },
      {
        slug: "lectors",
        name: "Lectors",
        tagline: "Proclaim the Word at Mass.",
        description:
          "Schedule rotates monthly. Training provided. Adults and mature teens welcome.",
        audiences: ["adults", "teens"],
        category: "worship",
        matchmakerTags: ["worship", "service"],
        meetingCadence: "Schedule-based",
        contactEmail: "liturgy@sainthelen.org",
        status: "published",
        orderingPriority: 60,
      },
      {
        slug: "st-vincent-de-paul",
        name: "St. Vincent de Paul Society",
        tagline: "Neighbors helping neighbors.",
        description:
          "Confidential, direct assistance to families in need across Westfield. Volunteers take shifts on our helpline and coordinate deliveries.",
        audiences: ["adults"],
        category: "service",
        matchmakerTags: ["service", "community", "outreach"],
        meetingCadence: "Varies by role",
        contactEmail: "svdp@sainthelen.org",
        status: "published",
        orderingPriority: 70,
      },
      {
        slug: "bible-study",
        name: "Thursday Morning Bible Study",
        tagline: "Scripture, coffee, and good company.",
        description:
          "A rolling study of the Sunday readings and occasional books. Drop in any week.",
        audiences: ["adults"],
        category: "formation",
        matchmakerTags: ["formation", "community", "scripture"],
        meetingCadence: "Thursdays, 10:00 AM",
        contactEmail: "formation@sainthelen.org",
        status: "published",
        orderingPriority: 80,
      },
    ])
    .onConflictDoNothing({ target: ministries.slug })
    .returning({ id: ministries.id, slug: ministries.slug });

  console.log(`  ✓ ministries (${ministryRows.length} inserted / already present)`);

  /* ---------- events ---------------------------------------------- */
  const today = new Date();
  const mkDate = (daysAhead: number, hour: number, minute = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const eventRows = await db
    .insert(events)
    .values([
      {
        slug: "harvest-fest-2026",
        title: "Harvest Fest 2026",
        lede:
          "Our biggest day of the year — live music, food trucks, bounce houses, and the rectory's dunk tank.",
        body:
          "Join us on the front lawn for our biggest day of the year. All-parish event. Rain date the following weekend.",
        startsAt: mkDate(14, 11),
        endsAt: mkDate(14, 18),
        location: "Saint Helen front lawn",
        audiences: ["all-parish", "families"],
        categories: ["fellowship"],
        isFeatured: true,
        status: "published",
        createdBy: admin?.id,
      },
      {
        slug: "confirmation-retreat-2026",
        title: "Confirmation Retreat",
        lede: "Overnight retreat for candidates and sponsors.",
        startsAt: mkDate(7, 9),
        endsAt: mkDate(8, 16),
        location: "Camp Bernie, Port Murray NJ",
        audiences: ["teens"],
        categories: ["formation", "sacraments"],
        status: "published",
        createdBy: admin?.id,
      },
      {
        slug: "lenten-soup-supper",
        title: "Lenten Soup Supper",
        lede: "Simple meal, silent prayer, shared community.",
        startsAt: mkDate(3, 18),
        endsAt: mkDate(3, 20),
        location: "Parish Hall",
        audiences: ["adults"],
        categories: ["worship", "fellowship"],
        status: "published",
        createdBy: admin?.id,
      },
      {
        slug: "mothers-day-brunch",
        title: "Mother's Day Brunch",
        lede: "Coffee, pastries, and carnations after every Sunday Mass.",
        startsAt: mkDate(21, 8),
        endsAt: mkDate(21, 14),
        location: "Parish Hall",
        audiences: ["families"],
        categories: ["fellowship"],
        status: "draft",
        createdBy: admin?.id,
      },
      {
        slug: "corpus-christi-procession",
        title: "Corpus Christi Procession",
        lede: "Outdoor Eucharistic procession following the 10:30 Mass.",
        startsAt: mkDate(42, 11, 30),
        endsAt: mkDate(42, 13),
        location: "Saint Helen to the grotto",
        audiences: ["all-parish"],
        categories: ["worship"],
        status: "published",
        createdBy: admin?.id,
      },
    ])
    .onConflictDoNothing({ target: events.slug })
    .returning({ id: events.id, slug: events.slug });

  console.log(`  ✓ events (${eventRows.length} inserted / already present)`);

  /* ---------- mass times ------------------------------------------ */
  const frTom = staffRows.find((s) => s.slug === "fr-tom");
  const frLuis = staffRows.find((s) => s.slug === "fr-luis");

  // Drizzle's .onConflictDoNothing needs a unique target — mass_times has
  // none that would naturally dedupe. Delete any existing rows first, then
  // re-insert. Idempotent via full replace.
  await db.delete(massTimes);
  await db.insert(massTimes).values([
    // Saturday vigil
    { dayOfWeek: 6, time: "17:00:00", kind: "vigil", label: "Saturday Vigil", presiderId: frTom?.id },
    // Sunday
    { dayOfWeek: 0, time: "07:30:00", kind: "sunday", presiderId: frTom?.id },
    { dayOfWeek: 0, time: "09:00:00", kind: "sunday", presiderId: frLuis?.id },
    { dayOfWeek: 0, time: "10:30:00", kind: "sunday", label: "Family Mass", presiderId: frTom?.id },
    { dayOfWeek: 0, time: "12:00:00", kind: "sunday", presiderId: frLuis?.id },
    // Weekday
    { dayOfWeek: 1, time: "08:00:00", kind: "daily" },
    { dayOfWeek: 2, time: "08:00:00", kind: "daily" },
    { dayOfWeek: 3, time: "08:00:00", kind: "daily" },
    { dayOfWeek: 4, time: "08:00:00", kind: "daily" },
    { dayOfWeek: 5, time: "08:00:00", kind: "daily" },
  ]);

  console.log("  ✓ mass_times (10 entries — vigil + 4 Sunday + 5 weekday)");
}
