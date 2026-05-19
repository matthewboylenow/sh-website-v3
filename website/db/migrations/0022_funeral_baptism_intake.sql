-- Funeral + baptism intake forms.
--
-- Adds a `form_submissions` table that stores every public sacramental
-- form submission with its full payload + a link to the generated PDF
-- in Vercel Blob. Recipients per form-kind live on site_settings.

CREATE TABLE "form_submissions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "kind" text NOT NULL,
    "payload" jsonb NOT NULL,
    "submitter_name" text NOT NULL,
    "submitter_email" text NOT NULL,
    "subject_name" text,
    "subject_date" text,
    "pdf_blob_key" text REFERENCES "blob_assets"("key"),
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "form_submissions_kind_idx" ON "form_submissions" ("kind");
CREATE INDEX "form_submissions_created_idx" ON "form_submissions" ("created_at");

ALTER TABLE "site_settings"
    ADD COLUMN "funeral_form_recipients" text[] DEFAULT '{}' NOT NULL,
    ADD COLUMN "baptism_form_recipients" text[] DEFAULT '{}' NOT NULL;
