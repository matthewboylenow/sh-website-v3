CREATE TABLE "pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "summary" text,
  "photo_blob_key" text REFERENCES "blob_assets"("key"),
  "status" text NOT NULL DEFAULT 'draft',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "last_edited_by" uuid REFERENCES "users"("id"),
  "last_edited_at" timestamp,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "pages_status_ck" CHECK ("status" IN ('draft','published','archived'))
);

CREATE UNIQUE INDEX "pages_slug_uq" ON "pages"("slug");
CREATE INDEX "pages_status_idx" ON "pages"("status");
