/**
 * Ministry seed data — generated from the May 2026 pastoral council audit.
 *
 * Source: /_audit/manifests/pages.json + /_audit/updates/* + /_audit/content-new/*.
 *
 * Use this as the basis for a new seed file under website/db/seed/ — wire it
 * into website/db/seed/run.ts alongside the existing seedDev().
 *
 * Each row matches the MinistryCreateInput shape from
 * website/lib/validators/ministries.ts. The TODO(audit) comments call out
 * fields that need a human pass before publishing.
 */
import type { MinistryCreateInput } from "../lib/validators/ministries";

// zod-defaulted fields (noindex) aren't on the inferred input type as
// optional, but they ARE optional at runtime. Loosen the static type so
// we don't have to scatter `noindex: false` across all 51 entries.
type AuditMinistry = Omit<MinistryCreateInput, "noindex"> & { noindex?: boolean };

export const auditMinistries: AuditMinistry[] = [
    {
      slug: "art-environment-ministry",
      name: "Art & Environment Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "families"],
      category: "worship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 10,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Art & Environment Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
        fields: [
          { kind: "system", systemKey: "name", label: "Your name", required: true, shown: true },
          { kind: "system", systemKey: "email", label: "Email", required: true, shown: true },
          { kind: "system", systemKey: "phone", label: "Phone (optional)", required: false, shown: true },
          { kind: "custom", id: "subcommittee", label: "Which subcommittee(s)?", type: "checkboxes", options: ["Design Guild", "Labor & Construction Crew", "Green Team", "Craft Team", "General Volunteers", "Vacation Bible School Decor Planning Committee"], required: false },
          { kind: "system", systemKey: "message", label: "Anything you'd like the leader to know? (optional)", required: false, shown: true },
        ],
      },
      // AUDIT: #1 (No Webpage) — Jessica Nicolosi — note: Added to doc
    },
    {
      slug: "bakery-ministry",
      name: "Bakery Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 20,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Bakery Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #2 (No Webpage) — Bob Albino — note: Added to doc
    },
    {
      slug: "baptism-ministry",
      name: "Baptism Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "families"],
      category: "sacraments",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 30,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Baptism Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #3 (No Webpage) — Tracey Sowa — note: Added to doc
    },
    {
      slug: "church-cleaning-linen-ministry",
      name: "Church Cleaning/Linen Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "worship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 40,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Church Cleaning/Linen Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #4 (No Webpage) — Marlene Rizk — note: Added to doc
    },
    {
      slug: "lectors",
      name: "Lectors",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth"],
      category: "worship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 50,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Lectors", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #5 (No Webpage) — Joseph Vaszily — note: Added to doc
    },
    {
      slug: "nursing-home-ministry",
      name: "Nursing Home Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 60,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Nursing Home Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #6 (No Webpage) — Joann Murphy — note: Added to doc
    },
    {
      slug: "sacristans",
      name: "Sacristans",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "worship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 70,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Sacristans", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #7 (No Webpage) — Marilyn Ryan / John Kerins — note: Added to doc
    },
    {
      slug: "soup-kitchens-st-joe-s",
      name: "Soup Kitchens - St. Joe's",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth", "families"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 80,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Soup Kitchens - St. Joe's", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #8 (No Webpage) — Alice Brucia — note: Added to doc
    },
    {
      slug: "soup-kitchens-st-mary-s",
      name: "Soup Kitchens - St. Mary's",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth", "families"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 90,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Soup Kitchens - St. Mary's", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #9 (No Webpage) — Ellen Murphy — note: Added to doc
    },
    {
      slug: "sunday-gospel-alive-in-me",
      name: "Sunday Gospel Alive in Me",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["teens", "youth"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 100,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Sunday Gospel Alive in Me", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #10 (No Webpage) — Mike Fusco — note: Added to doc
    },
    {
      slug: "wedding-ministry",
      name: "Wedding Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "sacraments",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 110,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Wedding Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #11 (No Webpage) — Denise Revello / Maribeth Vaszily — note: Added to doc
    },
    {
      slug: "westfield-food-pantry",
      name: "Westfield Food Pantry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth", "families"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 120,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Westfield Food Pantry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #12 (No Webpage) — Monica Bergin — note: Added to doc
    },
    {
      slug: "ageless",
      name: "Ageless Senior Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "fellowship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 130,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Ageless Senior Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #13 (Currently On Ministry Page) — JoAnn Murphy — note: none
      // legacy URL: https://sainthelen.org/ministries/ageless/
    },
    {
      slug: "altar-servers",
      name: "Altar Servers",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["teens", "youth"],
      category: "worship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 140,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Altar Servers", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #14 (Currently On Ministry Page) — Adrian Soltys — note: Adrian will update with Matt
      // legacy URL: https://sainthelen.org/ministries/altar-servers/
    },
    {
      slug: "care-ministry",
      name: "Care Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "janmeister1@outlook.com",
      isAcceptingNew: true,
      orderingPriority: 150,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Care Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #15 (Currently On Ministry Page) — Janice Meister/Susan Dodge — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/care-ministry/
    },
    {
      slug: "caregivers-support",
      name: "Caregiver's Support Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 160,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Caregiver's Support Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #16 (Currently On Ministry Page) — Cathy Colon — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/caregivers-support/
    },
    {
      slug: "catholic-families-connect",
      name: "Catholic Families Connect",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["families"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 170,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Catholic Families Connect", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #17 (Currently On Ministry Page) — Debbie Abbattista — note: none
      // legacy URL: https://sainthelen.org/ministries/catholic-families-connect/
    },
    {
      slug: "childrens-liturgy-of-the-word",
      name: "Children's Liturgy of the Word",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["teens", "youth"],
      category: "worship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "nmurphy@sainthelen.org",
      isAcceptingNew: true,
      orderingPriority: 180,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Children's Liturgy of the Word", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #18 (Currently On Ministry Page) — Nicole Murphy — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/childrens-liturgy-of-the-word/
    },
    {
      slug: "4cs",
      name: "Christ Centered Crochet Club (4C's)",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 190,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Christ Centered Crochet Club (4C's)", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #19 (Currently On Ministry Page) — Alicia Porter — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/4cs/
    },
    {
      slug: "cornerstone",
      name: "Cornerstone",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "danknott@gmail.com",
      isAcceptingNew: true,
      orderingPriority: 200,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Cornerstone", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #20 (Currently On Ministry Page) — Dan Nott — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/cornerstone/
    },
    {
      slug: "eft",
      name: "Elementary Families Together",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["families"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 210,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Elementary Families Together", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #21 (Currently On Ministry Page) — Nicole Murphy — note: Added to doc, Nicole sent updates to Matt
      // legacy URL: https://sainthelen.org/ministries/eft/
    },
    {
      slug: "contemplatives",
      name: "Everyday Contemplatives",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "pmanning87@gmail.com",
      isAcceptingNew: true,
      orderingPriority: 220,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Everyday Contemplatives", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #22 (Currently On Ministry Page) — Patrick Manning — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/contemplatives/
    },
    {
      slug: "extraordinary-ministers-of-the-eucharist",
      name: "Extraordinary Ministers of Holy Communion",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "worship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "mryan@sainthelen.org",
      isAcceptingNew: true,
      orderingPriority: 230,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Extraordinary Ministers of Holy Communion", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #23 (Currently On Ministry Page) — Marilyn Ryan — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/extraordinary-ministers-of-the-eucharist/
    },
    {
      slug: "family-support-for-persons-with-disabilities",
      name: "Family Support for Persons with Disabilities",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "families"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 240,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Family Support for Persons with Disabilities", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #24 (Currently On Ministry Page) — Maria Auricchio — note: Maria to follow up with Matt
      // legacy URL: https://sainthelen.org/ministries/family-support-for-persons-with-disabilities/
    },
    {
      slug: "funeral-support",
      name: "Funeral Support Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "worship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "mbrown@sainthelen.org",
      isAcceptingNew: true,
      orderingPriority: 250,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Funeral Support Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #25 (Currently On Ministry Page) — Marielle Brown — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/funeral-support/
    },
    {
      slug: "garden-ministry",
      name: "Garden Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth", "families"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "jeanamaier5@gmail.com",
      isAcceptingNew: true,
      orderingPriority: 260,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Garden Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #26 (Currently On Ministry Page) — Jean Maier — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/garden-ministry/
    },
    {
      slug: "helping-hands-and-hearts",
      name: "Helping Hands & Hearts",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "mryan@sainthelen.org",
      isAcceptingNew: true,
      orderingPriority: 270,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Helping Hands & Hearts", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #27 (Currently On Ministry Page) — Marilyn Ryan — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/helping-hands-and-hearts/
    },
    {
      slug: "hospitality-ministry",
      name: "Hospitality Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth"],
      category: "worship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "glaughlin1@gmail.com",
      isAcceptingNew: true,
      orderingPriority: 280,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Hospitality Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #28 (Currently On Ministry Page) — Gail Laughlin / Eileen Passananti — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/hospitality-ministry/
    },
    {
      slug: "kids-corner",
      name: "Kids Corner",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["teens", "youth"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "tsowa@sainthelen.org",
      isAcceptingNew: true,
      orderingPriority: 290,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Kids Corner", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #29 (Currently On Ministry Page) — Tracey Sowa — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/kids-corner/
    },
    {
      slug: "media-ministry",
      name: "Media Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth"],
      category: "worship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "pgomez@sainthelen.org",
      isAcceptingNew: true,
      orderingPriority: 300,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Media Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #30 (Currently On Ministry Page) — Patrica Gomez — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/media-ministry/
    },
    {
      slug: "mental-health-ministry",
      name: "Mental Health Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth", "families"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 310,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Mental Health Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #31 (Currently On Ministry Page) — Liz Migneco — note: none
      // legacy URL: https://sainthelen.org/ministries/mental-health-ministry/
    },
    {
      slug: "peace-and-justice",
      name: "Peace and Justice Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "at.mcdermottsp@comcast.net",
      isAcceptingNew: true,
      orderingPriority: 320,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Peace and Justice Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #32 (Currently On Ministry Page) — Shane McDermott — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/peace-and-justice/
    },
    {
      slug: "prayer-shawl",
      name: "Prayer Shawl Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 330,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Prayer Shawl Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #33 (Currently On Ministry Page) — Lori Gewirtz — note: none
      // legacy URL: https://sainthelen.org/ministries/prayer-shawl/
    },
    {
      slug: "respect-life-ministry",
      name: "Respect Life Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "ashok.maliakal@gmail.com",
      isAcceptingNew: true,
      orderingPriority: 340,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Respect Life Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #34 (Currently On Ministry Page) — Ashok Maliakal — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/respect-life-ministry/
    },
    {
      slug: "saint-helen-counseling-project",
      name: "Saint Helen Counseling Project",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth", "families"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "lmigneco@sainthelen.org",
      isAcceptingNew: true,
      orderingPriority: 350,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Saint Helen Counseling Project", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #35 (Currently On Ministry Page) — Liz Migneco — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/saint-helen-counseling-project/
    },
    {
      slug: "service-auction",
      name: "Service Auction",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 360,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Service Auction", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #36 (Currently On Ministry Page) — Ellen Murphy — note: none
      // legacy URL: https://sainthelen.org/ministries/service-auction/
    },
    {
      slug: "sing-n-pray",
      name: "Sing 'N Pray",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["families"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 370,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Sing 'N Pray", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #37 (Currently On Ministry Page) — Megan Soltys — note: none
      // legacy URL: https://sainthelen.org/ministries/sing-n-pray/
    },
    {
      slug: "sister-pats-kids-camp",
      name: "Sister Pat's Kids Camp",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth", "families"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 380,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Sister Pat's Kids Camp", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #38 (Currently On Ministry Page) — Regina Cappio Wilson/James Hughes — note: Added to doc
      // legacy URL: https://sainthelen.org/ministries/sister-pats-kids-camp/
    },
    {
      slug: "twelve",
      name: "Twelve",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "service",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 390,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "volunteer", label: "Volunteer with Twelve", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #39 (Currently On Ministry Page) — Tom Madaras — note: none
      // legacy URL: https://sainthelen.org/ministries/twelve/
    },
    {
      slug: "young-adult-ministry",
      name: "Abide Young Adult Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "pgomez@sainthelen.org",
      isAcceptingNew: true,
      orderingPriority: 400,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "join", label: "Join Abide Young Adult Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #40 (Standalone Page) — Patricia Gomez — note: Added to doc
      // legacy URL: https://sainthelen.org/young-adult-ministry/
    },
    {
      slug: "adoration",
      name: "Adoration Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth", "families"],
      category: "worship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "tsowa@sainthelen.org",
      isAcceptingNew: true,
      orderingPriority: 410,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "join", label: "Join Adoration Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #41 (Standalone Page) — Tracey Sowa — note: none
      // legacy URL: https://sainthelen.org/adoration/
    },
    {
      slug: "called",
      name: "Called & Gifted",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: "ccolonna@sainthelen.org",
      isAcceptingNew: true,
      orderingPriority: 420,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "join", label: "Join Called & Gifted", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #42 (Standalone Page) — Maria Auricchio — note: none
      // legacy URL: https://sainthelen.org/called/
    },
    {
      slug: "christlife",
      name: "ChristLife Series",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 430,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "join", label: "Join ChristLife Series", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #43 (Standalone Page) — Amanda Thiel — note: Added to doc
      // legacy URL: https://sainthelen.org/christlife/
    },
    {
      slug: "basketball",
      name: "CYO Basketball Program",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["teens", "youth"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 440,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "join", label: "Join CYO Basketball Program", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #44 (Standalone Page) — John Lampariello — note: Added to doc
      // legacy URL: https://sainthelen.org/basketball/
    },
    {
      slug: "grow",
      name: "Growing In Faith",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 450,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "join", label: "Join Growing In Faith", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #45 (Standalone Page) — Maria Auricchio — note: Added to doc
      // legacy URL: https://sainthelen.org/grow/
    },
    {
      slug: "lifelines",
      name: "LifeLines (Small Groups)",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth"],
      category: "fellowship",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 460,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "join", label: "Join LifeLines (Small Groups)", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #46 (Standalone Page) — Maria Auricchio — note: Added to doc
      // legacy URL: https://sainthelen.org/lifelines/
    },
    {
      slug: "music",
      name: "Music Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults", "teens", "youth", "families"],
      category: "music",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 470,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "join", label: "Join Music Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #47 (Standalone Page) — Adrian Soltys — note: none
      // legacy URL: https://sainthelen.org/music/
    },
    {
      slug: "pre-cana",
      name: "Pre-Cana Marriage Preparation",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "sacraments",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 480,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "join", label: "Join Pre-Cana Marriage Preparation", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #48 (Standalone Page) — Margaret Manning — note: Added to doc
      // legacy URL: https://sainthelen.org/pre-cana/
    },
    {
      slug: "vbs",
      name: "Vacation Bible School",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["teens", "youth"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 490,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "join", label: "Join Vacation Bible School", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #49 (Standalone Page) — Tracey Sowa — note: Added to doc
      // legacy URL: https://sainthelen.org/vbs/
    },
    {
      slug: "wwp",
      name: "Walking with Purpose",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["adults"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 500,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "join", label: "Join Walking with Purpose", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #50 (Standalone Page) — Ellen Murphy — note: Added to doc
      // legacy URL: https://sainthelen.org/wwp/
    },
    {
      slug: "youth-ministry",
      name: "Youth Ministry",
      tagline: null, // TODO(audit): pull from page intro
      description: null, // TODO(audit): rich description goes into pageSections, not here
      audiences: ["teens", "youth"],
      category: "formation",
      matchmakerTags: [], // TODO(audit): assign 2–4 tags per ministry for the matchmaker quiz
      meetingCadence: null, // TODO(audit): pull from page body if present
      leadStaffId: null, // TODO: link to a row in the staff table once seeded
      photoBlobKey: null, // TODO: upload _audit/public-ready/images-renamed/<hero>.jpg, set the returned blob URL/key here
      contactEmail: null,
      isAcceptingNew: true,
      orderingPriority: 510,
      status: "draft", // promote to 'published' after content review
      inquiryConfig: {
        enabled: true,
        buttons: [
          { kind: "join", label: "Join Youth Ministry", enabled: true },
          { kind: "inquire", label: "Ask a Question", enabled: true },
        ],
      },
      // AUDIT: #51 (Standalone Page) — Patti Gardner — note: Added to doc
      // legacy URL: https://sainthelen.org/youth-ministry/
    },
];

/**
 * Insert pattern (mirroring the existing seedDev pattern):
 *
 *   import { auditMinistries } from "./ministries-from-audit-data";
 *   const inserted = await db.insert(ministries)
 *     .values(auditMinistries)
 *     .onConflictDoUpdate({
 *       target: ministries.slug,
 *       set: {
 *         name: sql`excluded.name`,
 *         category: sql`excluded.category`,
 *         audiences: sql`excluded.audiences`,
 *         inquiryConfig: sql`excluded.inquiry_config`,
 *         updatedAt: new Date(),
 *       },
 *     })
 *     .returning({ id: ministries.id, slug: ministries.slug });
 */
