-- SEO fields on every public content type. All nullable / boolean default
-- false so existing rows render unchanged until an editor fills them in.

ALTER TABLE "ministries"
  ADD COLUMN "meta_title" text,
  ADD COLUMN "meta_description" text,
  ADD COLUMN "og_image_blob_key" text REFERENCES "blob_assets"("key"),
  ADD COLUMN "noindex" boolean NOT NULL DEFAULT false,
  ADD COLUMN "canonical_url" text;

ALTER TABLE "formation_pages"
  ADD COLUMN "meta_title" text,
  ADD COLUMN "meta_description" text,
  ADD COLUMN "og_image_blob_key" text REFERENCES "blob_assets"("key"),
  ADD COLUMN "noindex" boolean NOT NULL DEFAULT false,
  ADD COLUMN "canonical_url" text;

ALTER TABLE "pages"
  ADD COLUMN "meta_title" text,
  ADD COLUMN "meta_description" text,
  ADD COLUMN "og_image_blob_key" text REFERENCES "blob_assets"("key"),
  ADD COLUMN "noindex" boolean NOT NULL DEFAULT false,
  ADD COLUMN "canonical_url" text;

ALTER TABLE "posts"
  ADD COLUMN "meta_title" text,
  ADD COLUMN "meta_description" text,
  ADD COLUMN "og_image_blob_key" text REFERENCES "blob_assets"("key"),
  ADD COLUMN "noindex" boolean NOT NULL DEFAULT false,
  ADD COLUMN "canonical_url" text;

ALTER TABLE "events"
  ADD COLUMN "meta_title" text,
  ADD COLUMN "meta_description" text,
  ADD COLUMN "og_image_blob_key" text REFERENCES "blob_assets"("key"),
  ADD COLUMN "noindex" boolean NOT NULL DEFAULT false,
  ADD COLUMN "canonical_url" text;
