CREATE TABLE "announcements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" text DEFAULT 'slide_in' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "ribbon" text,
  "title" text NOT NULL,
  "body" text,
  "image_blob_key" text,
  "date_rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "cta_label" text,
  "cta_href" text,
  "show_delay_seconds" numeric(4, 1) DEFAULT '2.5' NOT NULL,
  "dismiss_days" integer DEFAULT 7 NOT NULL,
  "accent" text DEFAULT 'navy' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_image_blob_key_blob_assets_key_fk"
    FOREIGN KEY ("image_blob_key") REFERENCES "blob_assets"("key")
    ON DELETE no action ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "announcements_status_idx" ON "announcements" ("status");--> statement-breakpoint
CREATE INDEX "announcements_starts_at_idx" ON "announcements" ("starts_at");
