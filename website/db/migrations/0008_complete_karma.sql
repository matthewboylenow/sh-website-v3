CREATE TABLE "ministry_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ministry_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ministry_sections" ADD CONSTRAINT "ministry_sections_ministry_id_ministries_id_fk" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ministry_sections_ministry_idx" ON "ministry_sections" USING btree ("ministry_id");--> statement-breakpoint
CREATE INDEX "ministry_sections_position_idx" ON "ministry_sections" USING btree ("position");