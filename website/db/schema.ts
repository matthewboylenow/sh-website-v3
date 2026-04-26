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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_phone_uq").on(t.phone),
  ],
);

/**
 * Ministry leads — many-to-many between users and ministries. Replaces
 * the old `users.ministry_id` column. A user can lead any number of
 * ministries; a ministry can have any number of leads. Both ministry
 * inquiry routing and the dashboard scoping read from here.
 *
 * `is_primary` (optional flag) marks the canonical contact when there
 * are several — used for "where do I redirect on first sign-in" and
 * email "primary lead" labels.
 */
export const ministryLeads = pgTable(
  "ministry_leads",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ministryId: uuid("ministry_id")
      .notNull()
      .references((): AnyPgColumn => ministries.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
    addedBy: uuid("added_by").references(() => users.id),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.ministryId] }),
    index("ministry_leads_ministry_idx").on(t.ministryId),
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
    lastEditedBy: uuid("last_edited_by").references(() => users.id),
    lastEditedAt: timestamp("last_edited_at"),
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
    /**
     * Per-ministry inquiry form configuration. Drives whether the public
     * page shows a Join / Inquire / Volunteer button row.
     */
    inquiryConfig: jsonb("inquiry_config")
      .$type<MinistryInquiryConfig>()
      .notNull()
      .default({ enabled: true, buttons: [{ kind: "inquire", label: "Inquire about this ministry", enabled: true }] }),
    lastEditedBy: uuid("last_edited_by").references(() => users.id),
    lastEditedAt: timestamp("last_edited_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("ministries_slug_uq").on(t.slug),
    index("ministries_status_idx").on(t.status),
    index("ministries_category_idx").on(t.category),
  ],
);

/* ------------------------------------------------------------------ */
/* Formation pages — religious-ed content (kids/youth/adults/families) */
/* ------------------------------------------------------------------ */

export const FORMATION_CATEGORIES = [
  "kids",
  "youth",
  "adults",
  "families",
] as const;
export type FormationCategory = (typeof FORMATION_CATEGORIES)[number];

export const formationPages = pgTable(
  "formation_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    summary: text("summary"),
    description: text("description"), // sanitized HTML from TipTap
    category: text("category", { enum: FORMATION_CATEGORIES }).notNull(),
    audiences: text("audiences").array().default(sql`'{}'`).notNull(),
    photoBlobKey: text("photo_blob_key").references(() => blobAssets.key),
    contactEmail: text("contact_email"),
    leadStaffId: uuid("lead_staff_id").references(() => staff.id),
    orderingPriority: integer("ordering_priority").default(100).notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastEditedBy: uuid("last_edited_by").references(() => users.id),
    lastEditedAt: timestamp("last_edited_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("formation_pages_slug_uq").on(t.slug),
    index("formation_pages_category_idx").on(t.category),
    index("formation_pages_status_idx").on(t.status),
  ],
);

/* ------------------------------------------------------------------ */
/* Ministry sections — block-based content below the description       */
/* ------------------------------------------------------------------ */

/** Common header attached to every block. Optional — many sections
 *  render anonymously per the live site's pattern. */
export type SectionHeader = {
  heading?: string;
  subheading?: string;
  /** Optional small uppercase tracker shown above the heading.
   *  Same role as the eyebrow on the live mockup's section heads. */
  eyebrow?: string;
  /** "left" (default) or "center". Center sets a max-width and centers
   *  the eyebrow + title + rule + lede stack — matches the mockup's
   *  display-style section heads. */
  align?: "left" | "center";
  /** Anchor id for deep-linking — kebab-case, slugified by the editor. */
  anchorId?: string;
};

/** Allowlisted embed providers. The editor parses pasted URLs into one
 *  of these tagged shapes; render emits the canonical iframe markup. */
export type EmbedPayload =
  | { provider: "youtube"; videoId: string; title?: string }
  | { provider: "vimeo"; videoId: string; title?: string }
  | { provider: "bunny"; url: string; title?: string }
  | { provider: "spotify"; url: string; title?: string }
  | { provider: "apple_podcasts"; url: string; title?: string }
  | { provider: "google_form"; url: string; title?: string }
  | { provider: "eventbrite"; url: string; title?: string }
  | { provider: "signupgenius"; url: string; title?: string }
  | { provider: "touchpoint"; url: string; title?: string }
  | { provider: "iframe"; url: string; title?: string; height?: number };

export type LinkItem = {
  label: string;
  href: string;
  /** Optional small icon hint shown next to the label. */
  iconHint?: "external" | "pdf" | "form" | "video" | "calendar";
};

export type ButtonItem = {
  label: string;
  href: string;
  /** Visual variant. Primary = rust pill; secondary = navy outline. */
  variant?: "primary" | "secondary";
};

export type CardGridCard = {
  title: string;
  summary?: string;
  href?: string;
  imageBlobKey?: string | null;
  /** Optional CTA chip label. Renders as a small button on overlay-style
   *  cards; ignored for stacked cards (whole card is already the link). */
  ctaLabel?: string;
  /** Lucide icon name from the curated catalog. When set, bento tiles
   *  render the icon instead of the image. Unknown names render nothing
   *  and the placeholder arrow shows. */
  iconName?: string | null;
};

/** Parents that can own page_sections rows. Polymorphic discriminator. */
export const PAGE_SECTION_PARENTS = ["ministry", "formation", "homepage"] as const;
export type PageSectionParent = (typeof PAGE_SECTION_PARENTS)[number];

/** Leaf blocks — everything except the recursive Columns wrapper.
 *  Columns nest one level deep; Columns inside Columns is disallowed. */
export type PageLeafBlock =
  | { kind: "heading"; header: SectionHeader; level?: 2 | 3 }
  | { kind: "rich_text"; header?: SectionHeader; html: string }
  | {
      kind: "image";
      header?: SectionHeader;
      blobKey: string;
      alt?: string;
      caption?: string;
      href?: string;
    }
  | {
      kind: "image_text";
      header?: SectionHeader;
      blobKey: string;
      alt?: string;
      html: string;
      imageSide?: "left" | "right";
    }
  | {
      kind: "image_gallery";
      header?: SectionHeader;
      images: { blobKey: string; alt?: string; caption?: string }[];
      columns?: 2 | 3;
    }
  | { kind: "link_list"; header?: SectionHeader; items: LinkItem[] }
  | { kind: "button_group"; header?: SectionHeader; items: ButtonItem[] }
  | {
      kind: "video";
      header?: SectionHeader;
      url: string;
      /** Auto-detected: mp4 | hls | youtube | vimeo. Editor stores it
       *  for fast render-time branching. */
      type: "mp4" | "hls" | "youtube" | "vimeo";
      posterBlobKey?: string | null;
      caption?: string;
    }
  | {
      kind: "card_grid";
      header?: SectionHeader;
      cards: CardGridCard[];
      /** "uniform" = all cards same size, N-up grid (existing behavior).
       *  "bento" = first 2 cards render large with prominent images, rest
       *  drop into a compact 4-up tile row below — homepage "How can we
       *  serve you" pattern. */
      layout?: "uniform" | "bento";
      columns?: 2 | 3;
      /** "stacked" = image at top, text below (existing behavior).
       *  "overlay" = image fills the card with a dark gradient overlay;
       *  title/summary/CTA layer on top. Applies to uniform cards + bento
       *  heroes; bento tiles stay stacked regardless because they're too
       *  small to read text-over-image. */
      cardStyle?: "stacked" | "overlay";
    }
  | { kind: "embed"; header?: SectionHeader; embed: EmbedPayload }
  | {
      kind: "staff_card";
      header?: SectionHeader;
      staffId: string;
      /** When true, hide email/instagram even if present on the staff row. */
      hideContact?: boolean;
    }
  | {
      kind: "callout_banner";
      header?: SectionHeader;
      tag?: string;
      title: string;
      body?: string;
      ctaLabel?: string;
      ctaHref?: string;
      imageBlobKey?: string | null;
      tone?: "navy" | "warm" | "gold";
    }
  | {
      kind: "featured_ministries";
      header?: SectionHeader;
      /**
       * spotlight = orderingPriority + name; random = re-pick each render;
       * manual = render the exact `ministryIds` list.
       */
      mode: "spotlight" | "random" | "manual";
      count: number;
      ministryIds?: string[];
      ctaLabel?: string;
      ctaHref?: string;
      /** Background tone — "navy" makes the whole block dark like the
       *  current "Find your place" section. */
      tone?: "default" | "navy";
    }
  | {
      kind: "featured_events";
      header?: SectionHeader;
      count: number;
      /** Filter to a specific event category (taxonomy value). */
      category?: string;
      /** Filter to events tagged with this ministry. When unset and the
       *  block is rendered on a ministry page, falls back to the parent
       *  ministry id automatically. */
      ministryId?: string;
      /** When true on a ministry page, scope to the parent ministry. The
       *  renderer resolves the parent id from RenderContext. */
      autoScopeToParent?: boolean;
      ctaLabel?: string;
      ctaHref?: string;
    }
  | {
      kind: "pastor_welcome";
      header?: SectionHeader;
      /** Optional video — same shape as a video block. When set, the
       *  media column renders the video; otherwise it falls back to the
       *  pastor's photo. */
      videoUrl?: string;
      videoType?: "mp4" | "hls" | "youtube" | "vimeo";
      /** Photo shown when no video is set, or as the video poster. */
      photoBlobKey?: string | null;
      photoAlt?: string;
      /** Sanitized HTML body — the welcome letter itself. */
      html: string;
      /** Signature line — e.g. "Fr. Tom Quinn". */
      signatureName?: string;
      /** Sub-line under the signature — e.g. "Pastor". */
      signatureRole?: string;
      /** Which side the media sits on. Default left. */
      mediaSide?: "left" | "right";
    }
  | {
      kind: "podcast_episode";
      header?: SectionHeader;
      /** Spotify, Apple Podcasts, or Buzzsprout episode URL. Provider
       *  auto-detected at render so URL changes are friction-free. */
      url: string;
      /** Eyebrow above the heading — e.g. "Saint Helen Podcast". */
      showLabel?: string;
      /** Intro paragraph rendered above the player. */
      description?: string;
      /** Optional CTA below the player — "Subscribe to the show" or similar. */
      subscribeLabel?: string;
      subscribeHref?: string;
    };

/** Top-level block — leaves plus the Columns wrapper. */
export type PageSectionPayload =
  | PageLeafBlock
  | {
      kind: "columns";
      header?: SectionHeader;
      columns: { blocks: PageLeafBlock[] }[];
      ratio?: "equal" | "60-40" | "40-60";
    };

export type PageSectionKind = PageSectionPayload["kind"];

/**
 * Polymorphic section table. parentKind discriminates whether parentId
 * points at a ministry or a formation page. We don't FK parentId because
 * Postgres can't FK across multiple parent tables; the indexed
 * (parentKind, parentId) composite covers lookups, and ON DELETE CASCADE
 * is implemented in app code on the parent's delete path.
 */
export const pageSections = pgTable(
  "page_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentKind: text("parent_kind", { enum: PAGE_SECTION_PARENTS }).notNull(),
    parentId: uuid("parent_id").notNull(),
    position: integer("position").notNull().default(0),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<PageSectionPayload>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastEditedBy: uuid("last_edited_by").references(() => users.id),
    lastEditedAt: timestamp("last_edited_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("page_sections_parent_idx").on(t.parentKind, t.parentId),
    index("page_sections_position_idx").on(t.position),
  ],
);

/** Per-ministry inquiry form config. */
export type SystemFieldKey = "name" | "email" | "phone" | "message";
export type CustomFieldType = "text" | "textarea" | "select" | "radio" | "checkboxes";

export type InquiryField =
  | {
      kind: "system";
      systemKey: SystemFieldKey;
      label: string;
      required: boolean;
      shown: boolean;
    }
  | {
      kind: "custom";
      id: string;
      label: string;
      type: CustomFieldType;
      options?: string[];
      required: boolean;
    };

export type MinistryInquiryConfig = {
  enabled: boolean;
  buttons: {
    kind: "join" | "inquire" | "volunteer";
    label: string;
    enabled: boolean;
  }[];
  /** When undefined or empty, public form renders the 4 system defaults. */
  fields?: InquiryField[];
};

/* ------------------------------------------------------------------ */
/* Inquiries — per-ministry contact submissions + audit timeline       */
/* ------------------------------------------------------------------ */

export const INQUIRY_STATUSES = [
  "new",
  "contacted",
  "joined",
  "declined",
  "stuck",
] as const;

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ministryId: uuid("ministry_id")
      .notNull()
      .references(() => ministries.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["join", "inquire", "volunteer"] }).notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    message: text("message"),
    /**
     * Snapshot of any custom fields at submission time. Frozen-in-time
     * so renaming fields later doesn't break old rows.
     */
    customAnswers: jsonb("custom_answers").$type<Record<string, string>>(),
    status: text("status", { enum: INQUIRY_STATUSES }).notNull().default("new"),
    /** Optional reason code for declined / stuck rows. */
    reasonCode: text("reason_code"),
    notes: text("notes"),
    assignedTo: uuid("assigned_to").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastEditedBy: uuid("last_edited_by").references(() => users.id),
    lastEditedAt: timestamp("last_edited_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("inquiries_ministry_idx").on(t.ministryId),
    index("inquiries_status_idx").on(t.status),
    index("inquiries_created_idx").on(t.createdAt),
  ],
);

/**
 * Audit timeline. Every status change, note add, and magic-link click
 * lands here so admins can answer "who did what when" without grepping
 * email forwarding chains.
 */
export const inquiryEvents = pgTable(
  "inquiry_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    /** Null when the actor was anonymous-via-token (magic-link click). */
    userId: uuid("user_id").references(() => users.id),
    viaToken: boolean("via_token").default(false).notNull(),
    kind: text("kind", {
      enum: ["created", "status_change", "note_added", "assigned"],
    }).notNull(),
    payload: jsonb("payload"),
    at: timestamp("at").defaultNow().notNull(),
  },
  (t) => [index("inquiry_events_inquiry_idx").on(t.inquiryId)],
);

/* ------------------------------------------------------------------ */
/* Announcements — slide-ins + modal popups (e.g. closures)            */
/* ------------------------------------------------------------------ */

export const ANNOUNCEMENT_KINDS = ["slide_in", "modal"] as const;
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];

export const ANNOUNCEMENT_ACCENTS = ["navy", "rust", "gold"] as const;
export type AnnouncementAccent = (typeof ANNOUNCEMENT_ACCENTS)[number];

/** Repeatable date rows in an announcement card —
 *  e.g. "Apr 17 · Wear Blue Day". */
export type AnnouncementDateRow = { label: string; detail: string };

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: text("kind", { enum: ANNOUNCEMENT_KINDS }).notNull().default("slide_in"),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    /** Higher priority wins when multiple are active simultaneously. */
    priority: integer("priority").default(0).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),

    /* ---- Content ---- */
    ribbon: text("ribbon"), // small uppercase eyebrow
    title: text("title").notNull(),
    body: text("body"), // sanitized HTML
    imageBlobKey: text("image_blob_key").references(() => blobAssets.key),
    dateRows: jsonb("date_rows")
      .$type<AnnouncementDateRow[]>()
      .notNull()
      .default([]),
    ctaLabel: text("cta_label"),
    ctaHref: text("cta_href"),

    /* ---- Behavior ---- */
    /** Seconds to wait after page load before sliding in (slide_in only). */
    showDelaySeconds: numeric("show_delay_seconds", { precision: 4, scale: 1 })
      .default("2.5")
      .notNull(),
    /** Days a dismissal sticks in localStorage. 0 = session-only. */
    dismissDays: integer("dismiss_days").default(7).notNull(),
    /** Top-border + ribbon-tint color. */
    accent: text("accent", { enum: ANNOUNCEMENT_ACCENTS })
      .notNull()
      .default("navy"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastEditedBy: uuid("last_edited_by").references(() => users.id),
    lastEditedAt: timestamp("last_edited_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("announcements_status_idx").on(t.status),
    index("announcements_starts_at_idx").on(t.startsAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Posts — pastor letters + stewardship reports                        */
/* ------------------------------------------------------------------ */

export const POST_CATEGORIES = ["pastor", "stewardship"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    body: text("body"), // sanitized HTML from TipTap
    category: text("category", { enum: POST_CATEGORIES }).notNull(),
    photoBlobKey: text("photo_blob_key").references(() => blobAssets.key),
    authorId: uuid("author_id").references(() => users.id),
    /** Display name shown publicly (overrides users.name when set). */
    authorName: text("author_name"),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastEditedBy: uuid("last_edited_by").references(() => users.id),
    lastEditedAt: timestamp("last_edited_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("posts_slug_uq").on(t.slug),
    index("posts_category_idx").on(t.category),
    index("posts_published_at_idx").on(t.publishedAt),
    index("posts_status_idx").on(t.status),
  ],
);

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

/** Two-letter weekday codes — match RFC 5545 BYDAY abbreviations. */
export const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** End condition for a recurrence — "never" caps at the expansion horizon. */
export type RecurrenceEnd =
  | { kind: "never" }
  | { kind: "count"; count: number }
  | { kind: "until"; until: string /* ISO yyyy-mm-dd */ };

/** Recurrence rule. v1 supports weekly and "nth weekday of the month". */
export type Recurrence =
  | {
      freq: "weekly";
      /** Repeat every N weeks. 1 = every week. */
      interval: number;
      /** Weekdays the event recurs on (≥ 1). */
      byday: Weekday[];
      ends: RecurrenceEnd;
    }
  | {
      freq: "monthly_nth";
      /** Repeat every N months. 1 = every month. */
      interval: number;
      /** Which week of the month — 1=first, …, 5=fifth, "last"=last. */
      nth: 1 | 2 | 3 | 4 | 5 | "last";
      /** Single weekday for monthly_nth. */
      weekday: Weekday;
      ends: RecurrenceEnd;
    };

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
    /** Custom CTA label for the register button. Falls back to "Sign Up". */
    registerCtaLabel: text("register_cta_label"),
    /** Optional ministry this event belongs to. Surfaces on the ministry's
     *  page when a featured_events block is configured to filter by it. */
    ministryId: uuid("ministry_id").references(() => ministries.id, {
      onDelete: "set null",
    }),
    /** Recurrence rule. Null for one-off events. */
    recurrence: jsonb("recurrence").$type<Recurrence>(),
    /** ISO timestamps to skip when expanding the recurrence — cancellations. */
    exceptionDates: jsonb("exception_dates")
      .$type<string[]>()
      .notNull()
      .default([]),
    isFeatured: boolean("is_featured").default(false).notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastEditedBy: uuid("last_edited_by").references(() => users.id),
    lastEditedAt: timestamp("last_edited_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("events_slug_uq").on(t.slug),
    index("events_starts_at_idx").on(t.startsAt),
    index("events_ministry_id_idx").on(t.ministryId),
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
    lastEditedBy: uuid("last_edited_by").references(() => users.id),
    lastEditedAt: timestamp("last_edited_at"),
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
    lastEditedBy: uuid("last_edited_by").references(() => users.id),
    lastEditedAt: timestamp("last_edited_at"),
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

/**
 * Editor-managed taxonomies. Replaces hard-coded option lists across
 * the admin so editors can add/remove audiences and categories without
 * a deploy.
 */
export type Taxonomies = {
  eventCategories: string[];
  eventAudiences: string[];
  ministryAudiences: string[];
};

/**
 * Public masthead nav. Each top-level item can either be a plain link or
 * carry a 3-column mega-menu (link sections + optional featured card).
 * Edited from /admin/settings/navigation.
 */
export type NavLink = { label: string; href: string };

export type NavMegaSection = {
  heading: string;
  links: NavLink[];
};

export type NavMegaFeature = {
  tag?: string;
  title: string;
  body?: string;
  ctaLabel: string;
  ctaHref: string;
};

export type NavMega = {
  sections: NavMegaSection[];
  feature?: NavMegaFeature;
};

export type NavItem = {
  label: string;
  href: string;
  mega?: NavMega;
};

export type NavManifest = {
  items: NavItem[];
};

/** Hero CTA — small typed shape, repeatable inside the hero settings. */
export type HomepageHeroCta = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

/** Homepage hero — the structurally-special full-bleed video stage on /
 *  Lives in siteSettings rather than as a page_sections block because
 *  it bleeds out of the page container and has Mass-times sub-config. */
export type HomepageHero = {
  videoUrl?: string;
  posterUrl?: string;
  eyebrow?: string;
  title: string;
  lede?: string;
  ctas: HomepageHeroCta[];
  massPeek: {
    enabled: boolean;
    eyebrow?: string;
    linkLabel?: string;
    linkHref?: string;
  };
};

export const DEFAULT_HOMEPAGE_HERO: HomepageHero = {
  videoUrl: undefined,
  posterUrl: undefined,
  eyebrow: "We're glad you're here",
  title: "Welcome home.",
  lede:
    "Whether it's your first time or your hundredth, there's a seat saved for you at Saint Helen. Mass times, what to expect on Sunday, and the people who make this parish feel like home.",
  ctas: [
    { label: "Plan your visit", href: "/im-new", variant: "primary" },
    { label: "Watch Sunday's Mass", href: "/mass", variant: "secondary" },
  ],
  massPeek: {
    enabled: true,
    eyebrow: "This Sunday",
    linkLabel: "Full schedule →",
    linkHref: "/mass",
  },
};

/** Vanity-URL redirects edited from /admin/settings/redirects.
 *  Matched in middleware before any auth gate. `permanent` flips to a
 *  308; default is 307 so search engines don't memoize a wrong target. */
export type Redirect = {
  from: string;
  to: string;
  permanent?: boolean;
};

export const DEFAULT_NAV_MANIFEST: NavManifest = {
  items: [
    { label: "I'm New", href: "/im-new" },
    { label: "Worship", href: "/mass" },
    { label: "Ministries", href: "/ministries" },
    { label: "Events", href: "/events" },
    { label: "Bulletin", href: "/bulletin" },
  ],
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
    taxonomies: jsonb("taxonomies")
      .$type<Taxonomies>()
      .notNull()
      .default({ eventCategories: [], eventAudiences: [], ministryAudiences: [] }),
    nav: jsonb("nav")
      .$type<NavManifest>()
      .notNull()
      .default(DEFAULT_NAV_MANIFEST),
    homepageHero: jsonb("homepage_hero")
      .$type<HomepageHero>()
      .notNull()
      .default(DEFAULT_HOMEPAGE_HERO),
    redirects: jsonb("redirects")
      .$type<Redirect[]>()
      .notNull()
      .default([]),
    /** Logo shown in the masthead pill. PNG/SVG with transparent bg
     *  reads best on the navy/85 backdrop. */
    logoBlobKey: text("logo_blob_key").references(() => blobAssets.key),
    logoAlt: text("logo_alt"),
    /** Browser-tab icon. 32×32 or 64×64 PNG/SVG/ICO. Served via
     *  app/icon.tsx route handler — Next.js Metadata API picks it up. */
    faviconBlobKey: text("favicon_blob_key").references(() => blobAssets.key),
    /** 180×180 PNG used by iOS Add-to-Home-Screen. Falls back to favicon. */
    appleTouchIconBlobKey: text("apple_touch_icon_blob_key").references(
      () => blobAssets.key,
    ),
    footerCopy: text("footer_copy"),
    /** Sanitized HTML rendered in the thin bar below the main footer —
     *  copyright, privacy/terms links, etc. */
    bottomBarHtml: text("bottom_bar_html"),
    densityScale: numeric("density_scale", { precision: 3, scale: 2 })
      .default("1.00")
      .notNull(),
    lastEditedBy: uuid("last_edited_by").references(() => users.id),
    lastEditedAt: timestamp("last_edited_at"),
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
export type PageSection = typeof pageSections.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type FormationPage = typeof formationPages.$inferSelect;
export type MassTime = typeof massTimes.$inferSelect;
export type Bulletin = typeof bulletins.$inferSelect;
export type SeasonalBanner = typeof seasonalBanners.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type BlobAsset = typeof blobAssets.$inferSelect;
export type MinistryEdit = typeof ministryEdits.$inferSelect;
export type MinistryLead = typeof ministryLeads.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type InquiryEvent = typeof inquiryEvents.$inferSelect;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
