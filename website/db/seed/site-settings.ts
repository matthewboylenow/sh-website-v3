/**
 * Seed the site_settings singleton row.
 *
 * Idempotent: upserts by id=1. Safe to re-run. Values here are parish
 * defaults that editors refine via /admin/settings.
 */

import { sql } from "drizzle-orm";
import type { MatchmakerManifest } from "../schema";
import { db } from "../index";
import { siteSettings } from "../schema";

/**
 * Default Matchmaker manifest. Tuned to the dev-seeded ministries'
 * matchmakerTags so the quiz returns meaningful results out of the box.
 * Parish staff edit this from /admin/matchmaker — no deploy needed.
 */
const DEFAULT_MATCHMAKER: MatchmakerManifest = {
  fallbackTags: [],
  questions: [
    {
      id: "season",
      prompt: "What season of life are you in?",
      answers: [
        {
          id: "young",
          label: "High school or college",
          sublabel: "Ages 14–22",
          tags: ["teens", "formation", "community"],
        },
        {
          id: "young-adult",
          label: "Young adult",
          sublabel: "In my 20s or 30s",
          tags: ["community", "formation"],
        },
        {
          id: "family",
          label: "Raising kids",
          sublabel: "Family life",
          tags: ["families", "community"],
        },
        {
          id: "midlife",
          label: "Mid-life and beyond",
          sublabel: "50s–70s",
          tags: ["community", "formation"],
        },
      ],
    },
    {
      id: "style",
      prompt: "How do you like to connect with God?",
      answers: [
        {
          id: "quiet",
          label: "Quiet contemplation",
          sublabel: "Prayer, silence, reflection",
          tags: ["formation", "scripture"],
        },
        {
          id: "music",
          label: "Through music and liturgy",
          sublabel: "Singing, reading, serving at Mass",
          tags: ["music", "worship"],
        },
        {
          id: "community",
          label: "In community",
          sublabel: "Small groups, conversation",
          tags: ["community", "fellowship"],
        },
        {
          id: "service",
          label: "Hands-on service",
          sublabel: "Giving back, showing up",
          tags: ["service", "outreach"],
        },
      ],
    },
    {
      id: "time",
      prompt: "How much time do you have?",
      answers: [
        {
          id: "little",
          label: "Just a little",
          sublabel: "An hour or two a month",
          tags: ["service"],
        },
        {
          id: "some",
          label: "A regular rhythm",
          sublabel: "Weekly or bi-weekly",
          tags: ["formation", "community"],
        },
        {
          id: "lots",
          label: "I'm all in",
          sublabel: "Multiple nights a week",
          tags: ["community", "formation", "service"],
        },
        {
          id: "flex",
          label: "Flexible",
          sublabel: "Depends on the season",
          tags: ["community"],
        },
      ],
    },
  ],
};

export async function seedSiteSettings() {
  await db
    .insert(siteSettings)
    .values({
      id: 1,
      contactEmail: "parish@sainthelen.org",
      contactPhone: "(908) 232-1214",
      address: {
        street: "1600 Rahway Avenue",
        city: "Westfield",
        state: "NJ",
        zip: "07090",
      },
      socialLinks: {
        facebook: "https://facebook.com/sainthelenwestfield",
        youtube: undefined,
        instagram: undefined,
      },
      welcomeFormRecipients: ["mboyle@sainthelen.org"],
      giving: {
        primaryUrl: "", // populated from /admin/settings/giving when Touchpoint URLs are provided
      },
      matchmaker: DEFAULT_MATCHMAKER,
      footerCopy: "A Roman Catholic parish in the Archdiocese of Newark.",
      densityScale: "1.00",
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      // Only seed matchmaker if it's still the empty default — don't
      // clobber an admin's curated quiz on re-seed.
      set: {
        matchmaker: sql`CASE WHEN ${siteSettings.matchmaker} = '{"questions":[]}'::jsonb
                             THEN ${JSON.stringify(DEFAULT_MATCHMAKER)}::jsonb
                             ELSE ${siteSettings.matchmaker} END`,
      },
    });

  console.log("  ✓ site_settings (id=1) — matchmaker seeded if empty");
}
