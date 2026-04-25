/**
 * Drizzle schema for Saint Helen 3.0.
 *
 * Mirrors design-ref/pages/backend.html §03 (content tables) and §07
 * (auth + ministry self-service). Deliberately omits locale columns —
 * Spanish multilingual is deferred per the resolved decisions.
 */

import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Auth.js canonical tables (+ parish-specific columns on users)       */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
    image: text("image"),
    role: text("role", { enum: ["admin", "editor", "ministry_lead"] })
      .notNull()
      .default("editor"),
    phone: text("phone"), // E.164, unique (see index), nullable
    preferredAuthMethod: text("preferred_auth_method", { enum: ["email", "sms"] })
      .notNull()
      .default("email"),
    // ministry_lead role is scoped to one ministry via this FK.
    // Lazy arrow avoids the forward-reference issue (ministries is defined
    // later in the file) — Drizzle resolves it at query time.
    ministryId: uuid("ministry_id").references(
      (): AnyPgColumn => ministries.id,
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_phone_uq").on(t.phone),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ------------------------------------------------------------------ */
/* Blob asset registry — other tables reference our own stable key.    */
/* ------------------------------------------------------------------ */

export const blobAssets = pgTable("blob_assets", {
  key: text("key").primaryKey(), // stable app-owned id (e.g. "evt_harvest-fest-2026_hero")
  blobUrl: text("blob_url").notNull(), // rewritten through cdn.sainthelen.org at render
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  width: integer("width"),
  height: integer("height"),
  alt: text("alt"),
  caption: text("caption"),
  credit: text("credit"),
  uploadedBy: uuid("uploaded_by").references((): AnyPgColumn => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Staff — pastor, clergy, lay staff, ministry leads                   */
/* ------------------------------------------------------------------ */

export const staff = pgTable(
  "staff",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull(), // "Pastor", "Director of Music"
    bio: text("bio"),
    email: text("email"),
    photoBlobKey: text("photo_blob_key").references(() => blobAssets.key),
    orderingPriority: integer("ordering_priority").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("staff_slug_uq").on(t.slug)],
);

/* ------------------------------------------------------------------ */
/* Ministries — Find Your Place + Matchmaker source                    */
/* ------------------------------------------------------------------ */

export const ministries = pgTable(
  "ministries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    description: text("description"), // markdown
    audiences: text("audiences").array().default(sql`'{}'`).notNull(),
    category: text("category", {
      enum: [
        "worship",
        "formation",
        "fellowship",
        "service",
        "sacraments",
        "music",
      ],
    }),
    matchmakerTags: text("matchmaker_tags").array().default(sql`'{}'`).notNull(),
    meetingCadence: text("meeting_cadence"),
    leadStaffId: uuid("lead_staff_id").references(() => staff.id),
    photoBlobKey: text("photo_blob_key").references(() => blobAssets.key),
    contactEmail: text("contact_email"),
    isAcceptingNew: boolean("is_accepting_new").default(true).notNull(),
    orderingPriority: integer("ordering_priority").default(0).notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("ministries_slug_uq").on(t.slug),
    index("ministries_status_idx").on(t.status),
    index("ministries_category_idx").on(t.category),
  ],
);

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    lede: text("lede"),
    body: text("body"), // markdown
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    location: text("location"),
    audiences: text("audiences").array().default(sql`'{}'`).notNull(),
    categories: text("categories").array().default(sql`'{}'`).notNull(),
    photoBlobKey: text("photo_blob_key").references(() => blobAssets.key),
    registerUrl: text("register_url"),
    isFeatured: boolean("is_featured").default(false).notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("events_slug_uq").on(t.slug),
    index("events_starts_at_idx").on(t.startsAt),
    index("events_status_idx").on(t.status),
  ],
);

/* ------------------------------------------------------------------ */
/* Mass times — weekly recurring + date overrides                      */
/* ------------------------------------------------------------------ */

export const massTimes = pgTable(
  "mass_times",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dayOfWeek: smallint("day_of_week"), // 0=Sun..6=Sat; null for one-off holy days
    time: time("time").notNull(),
    kind: text("kind", {
      enum: ["sunday", "vigil", "daily", "holy_day"],
    }).notNull(),
    label: text("label"), // "Family Mass", "Youth-led"
    presiderId: uuid("presider_id").references(() => staff.id),
    liveStreamUrl: text("live_stream_url"),
    overrideDate: date("override_date"),
    overrideKind: text("override_kind", {
      enum: ["canceled", "added", "moved"],
    }),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("mass_times_day_idx").on(t.dayOfWeek),
    index("mass_times_override_idx").on(t.overrideDate),
  ],
);

/* ------------------------------------------------------------------ */
/* Bulletins — weekly PDF archive                                      */
/* ------------------------------------------------------------------ */

export const bulletins = pgTable(
  "bulletins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    weekOf: date("week_of").notNull(),
    title: text("title"), // "Second Sunday of Easter"
    pdfBlobKey: text("pdf_blob_key")
      .notNull()
      .references(() => blobAssets.key),
    thumbBlobKey: text("thumb_blob_key").references(() => blobAssets.key),
    pageCount: integer("page_count"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("bulletins_week_of_uq").on(t.weekOf)],
);

/* ------------------------------------------------------------------ */
/* Seasonal banners — time-boxed homepage banner                       */
/* ------------------------------------------------------------------ */

export const seasonalBanners = pgTable(
  "seasonal_banners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    ctaLabel: text("cta_label"),
    ctaUrl: text("cta_url"),
    photoBlobKey: text("photo_blob_key").references(() => blobAssets.key),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("seasonal_banners_window_idx").on(t.startsAt, t.endsAt)],
);

/* ------------------------------------------------------------------ */
/* Site settings — singleton (id is always 1)                          */
/* ------------------------------------------------------------------ */

export type GivingSettings = {
  primaryUrl: string;
  recurringUrl?: string;
  seasonal?: {
    label: string;
    url: string;
    activeFrom: string; // ISO date
    activeUntil: string; // ISO date
  }[];
  designations?: { label: string; url: string }[];
};

export type SiteAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
  geo?: { lat: number; lng: number };
};

export type SocialLinks = {
  facebook?: string;
  youtube?: string;
  instagram?: string;
};

/** Ministry Matchmaker manifest — edited from /admin/matchmaker. */
export type MatchmakerAnswer = {
  /** Stable id used in the scoring API. */
  id: string;
  /** Primary text on the option button. */
  label: string;
  /** Smaller helper text under the label (optional). */
  sublabel?: string;
  /**
   * Tags scoring intersects with each ministry's matchmakerTags array.
   * Each match contributes 1 to the ministry's score.
   */
  tags: string[];
};

export type MatchmakerQuestion = {
  id: string;
  prompt: string;
  answers: MatchmakerAnswer[];
};

export type MatchmakerManifest = {
  questions: MatchmakerQuestion[];
  /**
   * Tags applied automatically to every quiz submission. Useful as a
   * floor — e.g. always nudge toward newcomer-friendly ministries.
   */
  fallbackTags?: string[];
};

export const siteSettings = pgTable(
  "site_settings",
  {
    id: smallint("id").primaryKey(), // always 1 — CHECK enforces singleton
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    address: jsonb("address").$type<SiteAddress>(),
    socialLinks: jsonb("social_links").$type<SocialLinks>(),
    welcomeFormRecipients: text("welcome_form_recipients")
      .array()
      .default(sql`'{}'`)
      .notNull(),
    giving: jsonb("giving")
      .$type<GivingSettings>()
      .notNull()
      .default({ primaryUrl: "" }),
    matchmaker: jsonb("matchmaker")
      .$type<MatchmakerManifest>()
      .notNull()
      .default({ questions: [] }),
    footerCopy: text("footer_copy"),
    densityScale: numeric("density_scale", { precision: 3, scale: 2 })
      .default("1.00")
      .notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [check("site_settings_singleton_ck", sql`${t.id} = 1`)],
);

/* ------------------------------------------------------------------ */
/* Ministry edits — draft + approve queue (ships behind feature flag)  */
/* ------------------------------------------------------------------ */

export type MinistryEditProposed = {
  tagline?: string | null;
  description?: string | null;
  meetingCadence?: string | null;
  photoBlobKey?: string | null;
  contactEmail?: string | null;
  faq?: { q: string; a: string }[];
  isAcceptingNew?: boolean;
};

export const ministryEdits = pgTable(
  "ministry_edits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ministryId: uuid("ministry_id")
      .notNull()
      .references(() => ministries.id, { onDelete: "cascade" }),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id),
    proposed: jsonb("proposed").$type<MinistryEditProposed>().notNull(),
    status: text("status", {
      enum: ["pending", "approved", "rejected", "withdrawn"],
    })
      .notNull()
      .default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewerNote: text("reviewer_note"),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at"),
  },
  (t) => [
    index("ministry_edits_ministry_idx").on(t.ministryId),
    index("ministry_edits_status_idx").on(t.status),
  ],
);

/* ------------------------------------------------------------------ */
/* Inferred row types — import these for query return shapes           */
/* ------------------------------------------------------------------ */

export type User = typeof users.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Ministry = typeof ministries.$inferSelect;
export type Event = typeof events.$inferSelect;
export type MassTime = typeof massTimes.$inferSelect;
export type Bulletin = typeof bulletins.$inferSelect;
export type SeasonalBanner = typeof seasonalBanners.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type BlobAsset = typeof blobAssets.$inferSelect;
export type MinistryEdit = typeof ministryEdits.$inferSelect;
