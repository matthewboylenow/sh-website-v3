import { z } from "zod";
import { isValidIconName } from "@/lib/icon-catalog";

/**
 * Validators for the ministry block system. Mirrors the discriminated
 * union in db/schema.ts (PageSectionPayload). Recursive on the
 * Columns block, capped at one nesting level by `nestedBlock`.
 */

const HeaderSchema = z.object({
  heading: z.string().max(120).optional(),
  subheading: z.string().max(200).optional(),
  eyebrow: z.string().max(60).optional(),
  align: z.enum(["left", "center"]).optional(),
  anchorId: z
    .string()
    .max(60)
    .regex(/^[a-z0-9-]*$/, "Lowercase letters, numbers, hyphens")
    .optional(),
});

const LinkItemSchema = z.object({
  label: z.string().min(1).max(120),
  href: z.string().min(1).max(1000),
  iconHint: z.enum(["external", "pdf", "form", "video", "calendar"]).optional(),
});

const ButtonItemSchema = z.object({
  label: z.string().min(1).max(60),
  href: z.string().min(1).max(1000),
  variant: z.enum(["primary", "secondary"]).optional(),
});

const EmbedPayloadSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("youtube"), videoId: z.string().min(1).max(40), title: z.string().max(120).optional() }),
  z.object({ provider: z.literal("vimeo"), videoId: z.string().min(1).max(40), title: z.string().max(120).optional() }),
  z.object({ provider: z.literal("bunny"), url: z.string().url().max(1000), title: z.string().max(120).optional() }),
  z.object({ provider: z.literal("spotify"), url: z.string().url().max(1000), title: z.string().max(120).optional() }),
  z.object({ provider: z.literal("apple_podcasts"), url: z.string().url().max(1000), title: z.string().max(120).optional() }),
  z.object({ provider: z.literal("google_form"), url: z.string().url().max(1000), title: z.string().max(120).optional() }),
  z.object({ provider: z.literal("eventbrite"), url: z.string().url().max(1000), title: z.string().max(120).optional() }),
  z.object({ provider: z.literal("signupgenius"), url: z.string().url().max(1000), title: z.string().max(120).optional() }),
  z.object({ provider: z.literal("touchpoint"), url: z.string().url().max(1000), title: z.string().max(120).optional() }),
  z.object({
    provider: z.literal("iframe"),
    url: z.string().url().max(1000),
    title: z.string().max(120).optional(),
    height: z.coerce.number().int().min(120).max(2000).optional(),
  }),
]);

const CardGridCardSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().max(500).optional(),
  href: z.string().max(1000).optional(),
  imageBlobKey: z.string().max(500).optional().nullable(),
  ctaLabel: z.string().max(40).optional(),
  iconName: z
    .string()
    .max(60)
    .optional()
    .nullable()
    .refine((v) => v == null || v === "" || isValidIconName(v), {
      message: "Unknown icon",
    }),
});

/**
 * Leaf blocks — every block kind except Columns. Columns embed leaves
 * but cannot embed Columns themselves (one nesting level).
 */
const LeafPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("heading"),
    header: HeaderSchema,
    level: z.union([z.literal(2), z.literal(3)]).optional(),
  }),
  z.object({
    kind: z.literal("rich_text"),
    header: HeaderSchema.optional(),
    html: z.string().max(40000),
  }),
  z.object({
    kind: z.literal("image"),
    header: HeaderSchema.optional(),
    // Allow empty during in-progress edits — public renderer hides the block
    // when no image is bound. Pre-cap at 500 chars when present.
    blobKey: z.string().max(500),
    alt: z.string().max(200).optional(),
    caption: z.string().max(300).optional(),
    href: z.string().max(1000).optional(),
  }),
  z.object({
    kind: z.literal("image_text"),
    header: HeaderSchema.optional(),
    // Optional in-progress; renderer collapses to single column when missing.
    blobKey: z.string().max(500),
    alt: z.string().max(200).optional(),
    html: z.string().max(20000),
    imageSide: z.enum(["left", "right"]).optional(),
  }),
  z.object({
    kind: z.literal("image_gallery"),
    header: HeaderSchema.optional(),
    images: z
      .array(
        z.object({
          // Empty rows skipped at render — let admins build incrementally.
          blobKey: z.string().max(500),
          alt: z.string().max(200).optional(),
          caption: z.string().max(300).optional(),
        }),
      )
      .max(20),
    columns: z.union([z.literal(2), z.literal(3)]).optional(),
  }),
  z.object({
    kind: z.literal("link_list"),
    header: HeaderSchema.optional(),
    items: z.array(LinkItemSchema).min(1).max(40),
  }),
  z.object({
    kind: z.literal("button_group"),
    header: HeaderSchema.optional(),
    items: z.array(ButtonItemSchema).min(1).max(8),
  }),
  z.object({
    kind: z.literal("video"),
    header: HeaderSchema.optional(),
    url: z.string().url().max(1000),
    type: z.enum(["mp4", "hls", "youtube", "vimeo"]),
    posterBlobKey: z.string().max(500).optional().nullable(),
    caption: z.string().max(300).optional(),
  }),
  z.object({
    kind: z.literal("card_grid"),
    header: HeaderSchema.optional(),
    cards: z.array(CardGridCardSchema).min(1).max(12),
    layout: z.enum(["uniform", "bento"]).optional(),
    columns: z.union([z.literal(2), z.literal(3)]).optional(),
    cardStyle: z.enum(["stacked", "overlay"]).optional(),
  }),
  z.object({
    kind: z.literal("embed"),
    header: HeaderSchema.optional(),
    embed: EmbedPayloadSchema,
  }),
  z.object({
    kind: z.literal("staff_card"),
    header: HeaderSchema.optional(),
    staffId: z.uuid(),
    hideContact: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("callout_banner"),
    header: HeaderSchema.optional(),
    tag: z.string().max(40).optional(),
    title: z.string().min(1).max(120),
    body: z.string().max(500).optional(),
    ctaLabel: z.string().max(40).optional(),
    ctaHref: z.string().max(1000).optional(),
    imageBlobKey: z.string().max(500).optional().nullable(),
    tone: z.enum(["navy", "warm", "gold"]).optional(),
  }),
  z.object({
    kind: z.literal("featured_ministries"),
    header: HeaderSchema.optional(),
    mode: z.enum(["spotlight", "random", "manual"]),
    count: z.coerce.number().int().min(1).max(8),
    ministryIds: z.array(z.uuid()).max(20).optional(),
    ctaLabel: z.string().max(40).optional(),
    ctaHref: z.string().max(1000).optional(),
    tone: z.enum(["default", "navy"]).optional(),
  }),
  z.object({
    kind: z.literal("featured_events"),
    header: HeaderSchema.optional(),
    count: z.coerce.number().int().min(1).max(12),
    category: z.string().max(60).optional(),
    ministryId: z.string().uuid().optional(),
    autoScopeToParent: z.boolean().optional(),
    ctaLabel: z.string().max(40).optional(),
    ctaHref: z.string().max(1000).optional(),
  }),
  z.object({
    kind: z.literal("podcast_episode"),
    header: HeaderSchema.optional(),
    // Loose URL — iTunes/RSS feed URLs can include odd query strings.
    // We just need a non-empty string; fetch will fail at render time
    // if it's truly broken.
    feedUrl: z.string().min(1).max(1000),
    /** When set, render this episode by GUID; otherwise the latest. */
    episodeGuid: z.string().max(500).optional(),
    showLabel: z.string().max(60).optional(),
    description: z.string().max(1000).optional(),
    subscribeLabel: z.string().max(40).optional(),
    subscribeHref: z.string().max(1000).optional(),
  }),
  z.object({
    kind: z.literal("pastor_welcome"),
    header: HeaderSchema.optional(),
    // Optional in-progress: editor allows saving with no media yet.
    videoUrl: z.string().max(1000).optional(),
    videoType: z.enum(["mp4", "hls", "youtube", "vimeo"]).optional(),
    photoBlobKey: z.string().max(500).optional().nullable(),
    photoAlt: z.string().max(200).optional(),
    html: z.string().max(20000),
    signatureName: z.string().max(120).optional(),
    signatureRole: z.string().max(120).optional(),
    mediaSide: z.enum(["left", "right"]).optional(),
  }),
]);

const ColumnsBlockSchema = z.object({
  kind: z.literal("columns"),
  header: HeaderSchema.optional(),
  ratio: z.enum(["equal", "60-40", "40-60"]).optional(),
  columns: z
    .array(z.object({ blocks: z.array(LeafPayloadSchema).max(20) }))
    .min(2)
    .max(3),
});

export const PageSectionPayloadSchema = z.union([
  LeafPayloadSchema,
  ColumnsBlockSchema,
]);

export type PageSectionPayloadInput = z.infer<typeof PageSectionPayloadSchema>;

export const MinistrySectionsManifestSchema = z.object({
  sections: z
    .array(
      z.object({
        /** Stable client id used to target updates pre-save. Empty string for new rows. */
        clientId: z.string().max(40),
        payload: PageSectionPayloadSchema,
      }),
    )
    .max(40),
});

export type MinistrySectionsManifestInput = z.infer<typeof MinistrySectionsManifestSchema>;
