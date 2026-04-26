ALTER TABLE "site_settings" ADD COLUMN "logo_blob_key" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "logo_alt" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "bottom_bar_html" text;--> statement-breakpoint

ALTER TABLE "site_settings"
  ADD CONSTRAINT "site_settings_logo_blob_key_blob_assets_key_fk"
    FOREIGN KEY ("logo_blob_key") REFERENCES "blob_assets"("key")
    ON DELETE no action ON UPDATE no action;
