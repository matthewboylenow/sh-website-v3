-- Add favicon + apple-touch-icon to site_settings.
ALTER TABLE "site_settings"
  ADD COLUMN "favicon_blob_key" text REFERENCES "blob_assets"("key"),
  ADD COLUMN "apple_touch_icon_blob_key" text REFERENCES "blob_assets"("key");

-- Add last-edited-by + last-edited-at audit columns to every content
-- table. Nullable so existing rows don't need a backfill; populated by
-- server actions on every save going forward.
ALTER TABLE "staff"
  ADD COLUMN "last_edited_by" uuid REFERENCES "users"("id"),
  ADD COLUMN "last_edited_at" timestamp;

ALTER TABLE "ministries"
  ADD COLUMN "last_edited_by" uuid REFERENCES "users"("id"),
  ADD COLUMN "last_edited_at" timestamp;

ALTER TABLE "formation_pages"
  ADD COLUMN "last_edited_by" uuid REFERENCES "users"("id"),
  ADD COLUMN "last_edited_at" timestamp;

ALTER TABLE "page_sections"
  ADD COLUMN "last_edited_by" uuid REFERENCES "users"("id"),
  ADD COLUMN "last_edited_at" timestamp;

ALTER TABLE "inquiries"
  ADD COLUMN "last_edited_by" uuid REFERENCES "users"("id"),
  ADD COLUMN "last_edited_at" timestamp;

ALTER TABLE "announcements"
  ADD COLUMN "last_edited_by" uuid REFERENCES "users"("id"),
  ADD COLUMN "last_edited_at" timestamp;

ALTER TABLE "posts"
  ADD COLUMN "last_edited_by" uuid REFERENCES "users"("id"),
  ADD COLUMN "last_edited_at" timestamp;

ALTER TABLE "events"
  ADD COLUMN "last_edited_by" uuid REFERENCES "users"("id"),
  ADD COLUMN "last_edited_at" timestamp;

ALTER TABLE "mass_times"
  ADD COLUMN "last_edited_by" uuid REFERENCES "users"("id"),
  ADD COLUMN "last_edited_at" timestamp;

ALTER TABLE "bulletins"
  ADD COLUMN "last_edited_by" uuid REFERENCES "users"("id"),
  ADD COLUMN "last_edited_at" timestamp;

ALTER TABLE "seasonal_banners"
  ADD COLUMN "last_edited_by" uuid REFERENCES "users"("id"),
  ADD COLUMN "last_edited_at" timestamp;

ALTER TABLE "site_settings"
  ADD COLUMN "last_edited_by" uuid REFERENCES "users"("id"),
  ADD COLUMN "last_edited_at" timestamp;
