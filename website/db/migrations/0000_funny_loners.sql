CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "blob_assets" (
	"key" text PRIMARY KEY NOT NULL,
	"blob_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text,
	"caption" text,
	"credit" text,
	"uploaded_by" uuid,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulletins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_of" date NOT NULL,
	"title" text,
	"pdf_blob_key" text NOT NULL,
	"thumb_blob_key" text,
	"page_count" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"lede" text,
	"body" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"location" text,
	"audiences" text[] DEFAULT '{}' NOT NULL,
	"categories" text[] DEFAULT '{}' NOT NULL,
	"photo_blob_key" text,
	"register_url" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mass_times" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_of_week" smallint,
	"time" time NOT NULL,
	"kind" text NOT NULL,
	"label" text,
	"presider_id" uuid,
	"live_stream_url" text,
	"override_date" date,
	"override_kind" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ministries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"description" text,
	"audiences" text[] DEFAULT '{}' NOT NULL,
	"category" text,
	"matchmaker_tags" text[] DEFAULT '{}' NOT NULL,
	"meeting_cadence" text,
	"lead_staff_id" uuid,
	"photo_blob_key" text,
	"contact_email" text,
	"is_accepting_new" boolean DEFAULT true NOT NULL,
	"ordering_priority" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ministry_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ministry_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"proposed" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewer_note" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "seasonal_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"cta_label" text,
	"cta_url" text,
	"photo_blob_key" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" smallint PRIMARY KEY NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"address" jsonb,
	"social_links" jsonb,
	"welcome_form_recipients" text[] DEFAULT '{}' NOT NULL,
	"giving" jsonb DEFAULT '{"primaryUrl":""}'::jsonb NOT NULL,
	"footer_copy" text,
	"density_scale" numeric(3, 2) DEFAULT '1.00' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton_ck" CHECK ("site_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"bio" text,
	"email" text,
	"photo_blob_key" text,
	"ordering_priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"role" text DEFAULT 'editor' NOT NULL,
	"phone" text,
	"preferred_auth_method" text DEFAULT 'email' NOT NULL,
	"ministry_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blob_assets" ADD CONSTRAINT "blob_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_pdf_blob_key_blob_assets_key_fk" FOREIGN KEY ("pdf_blob_key") REFERENCES "public"."blob_assets"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_thumb_blob_key_blob_assets_key_fk" FOREIGN KEY ("thumb_blob_key") REFERENCES "public"."blob_assets"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_photo_blob_key_blob_assets_key_fk" FOREIGN KEY ("photo_blob_key") REFERENCES "public"."blob_assets"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mass_times" ADD CONSTRAINT "mass_times_presider_id_staff_id_fk" FOREIGN KEY ("presider_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministries" ADD CONSTRAINT "ministries_lead_staff_id_staff_id_fk" FOREIGN KEY ("lead_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministries" ADD CONSTRAINT "ministries_photo_blob_key_blob_assets_key_fk" FOREIGN KEY ("photo_blob_key") REFERENCES "public"."blob_assets"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministry_edits" ADD CONSTRAINT "ministry_edits_ministry_id_ministries_id_fk" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministry_edits" ADD CONSTRAINT "ministry_edits_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ministry_edits" ADD CONSTRAINT "ministry_edits_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasonal_banners" ADD CONSTRAINT "seasonal_banners_photo_blob_key_blob_assets_key_fk" FOREIGN KEY ("photo_blob_key") REFERENCES "public"."blob_assets"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_photo_blob_key_blob_assets_key_fk" FOREIGN KEY ("photo_blob_key") REFERENCES "public"."blob_assets"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_ministry_id_ministries_id_fk" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bulletins_week_of_uq" ON "bulletins" USING btree ("week_of");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_uq" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mass_times_day_idx" ON "mass_times" USING btree ("day_of_week");--> statement-breakpoint
CREATE INDEX "mass_times_override_idx" ON "mass_times" USING btree ("override_date");--> statement-breakpoint
CREATE UNIQUE INDEX "ministries_slug_uq" ON "ministries" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ministries_status_idx" ON "ministries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ministries_category_idx" ON "ministries" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ministry_edits_ministry_idx" ON "ministry_edits" USING btree ("ministry_id");--> statement-breakpoint
CREATE INDEX "ministry_edits_status_idx" ON "ministry_edits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "seasonal_banners_window_idx" ON "seasonal_banners" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_slug_uq" ON "staff" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_uq" ON "users" USING btree ("phone");