import { z } from "zod";

/**
 * Validators for the ministry block system. Mirrors the discriminated
 * union in db/schema.ts (PageSectionPayload). Recursive on the
 * Columns block, capped at one nesting level by `nestedBlock`.
 */

const HeaderSchema = z.object({
  heading: z.string().max(120).optional(),
  subheading: z.string().max(200).optional(),
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
    blobKey: z.string().min(1).max(500),
    alt: z.string().max(200).optional(),
    caption: z.string().max(300).optional(),
    href: z.string().max(1000).optional(),
  }),
  z.object({
    kind: z.literal("image_text"),
    header: HeaderSchema.optional(),
    blobKey: z.string().min(1).max(500),
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
          blobKey: z.string().min(1).max(500),
          alt: z.string().max(200).optional(),
          caption: z.string().max(300).optional(),
        }),
      )
      .min(1)
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
    columns: z.union([z.literal(2), z.literal(3)]).optional(),
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
