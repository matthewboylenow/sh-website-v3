ALTER TABLE "events" ADD COLUMN "register_cta_label" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recurrence" jsonb;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "exception_dates" jsonb DEFAULT '[]'::jsonb NOT NULL;