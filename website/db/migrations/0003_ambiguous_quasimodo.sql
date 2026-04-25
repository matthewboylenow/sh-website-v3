CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ministry_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text,
	"custom_answers" jsonb,
	"status" text DEFAULT 'new' NOT NULL,
	"reason_code" text,
	"notes" text,
	"assigned_to" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"user_id" uuid,
	"via_token" boolean DEFAULT false NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ministry_leads" (
	"user_id" uuid NOT NULL,
	"ministry_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_by" uuid,
	CONSTRAINT "ministry_leads_user_id_ministry_id_pk" PRIMARY KEY("user_id","ministry_id")
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_ministry_id_ministries_id_fk";
--> statement-breakpoint
ALTER TABLE "ministries" ADD COLUMN "inquiry_config" jsonb DEFAULT '{"enabled":true,"buttons":[{"kind":"inquire","label":"Inquire about this ministry","enabled":true}]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_ministry_id_ministries_id_fk" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_events" ADD CONSTRAINT "inquiry_events_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_events" ADD CONSTRAINT "inquiry_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministry_leads" ADD CONSTRAINT "ministry_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministry_leads" ADD CONSTRAINT "ministry_leads_ministry_id_ministries_id_fk" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministry_leads" ADD CONSTRAINT "ministry_leads_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiries_ministry_idx" ON "inquiries" USING btree ("ministry_id");--> statement-breakpoint
CREATE INDEX "inquiries_status_idx" ON "inquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inquiries_created_idx" ON "inquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inquiry_events_inquiry_idx" ON "inquiry_events" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "ministry_leads_ministry_idx" ON "ministry_leads" USING btree ("ministry_id");--> statement-breakpoint
-- Copy any existing user.ministry_id assignments into the new join table
-- before dropping the column. ON CONFLICT keeps the migration idempotent
-- if it ever needs to be re-run mid-flight.
INSERT INTO "ministry_leads" ("user_id", "ministry_id", "is_primary")
SELECT "id", "ministry_id", true FROM "users" WHERE "ministry_id" IS NOT NULL
ON CONFLICT ("user_id", "ministry_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "ministry_id";