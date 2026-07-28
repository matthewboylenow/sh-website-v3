-- OCIA inquirer form + prayer request recipients (Wave 18.3).
-- form_submissions.kind gains "ocia" at the Drizzle type level only —
-- the column is plain text, no SQL change needed there.
ALTER TABLE "site_settings"
    ADD COLUMN "ocia_form_recipients" text[] DEFAULT '{}' NOT NULL,
    ADD COLUMN "prayer_form_recipients" text[] DEFAULT '{}' NOT NULL;
