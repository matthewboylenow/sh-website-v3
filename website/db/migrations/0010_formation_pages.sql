CREATE TABLE "formation_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "summary" text,
  "description" text,
  "category" text NOT NULL,
  "audiences" text[] DEFAULT '{}' NOT NULL,
  "photo_blob_key" text,
  "contact_email" text,
  "lead_staff_id" uuid,
  "ordering_priority" integer DEFAULT 100 NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "formation_pages"
  ADD CONSTRAINT "formation_pages_photo_blob_key_blob_assets_key_fk"
    FOREIGN KEY ("photo_blob_key") REFERENCES "blob_assets"("key")
    ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "formation_pages"
  ADD CONSTRAINT "formation_pages_lead_staff_id_staff_id_fk"
    FOREIGN KEY ("lead_staff_id") REFERENCES "staff"("id")
    ON DELETE no action ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "formation_pages_slug_uq" ON "formation_pages" ("slug");--> statement-breakpoint
CREATE INDEX "formation_pages_category_idx" ON "formation_pages" ("category");--> statement-breakpoint
CREATE INDEX "formation_pages_status_idx" ON "formation_pages" ("status");
