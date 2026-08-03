-- Answer engine (Wave 20) — cards, search log, feedback, rate limits.
--
-- Ported from the WordPress plugin Saint Helen Answers 2.4.1-b. The matching
-- and resolution logic lives in lib/answers/ with its tests; this is where it
-- lands.
--
-- Three departures from the WordPress schema, all deliberate:
--   * answer_cards.key is UNIQUE. WordPress resolved a duplicate key by
--     taking whichever row the query happened to return first, and a Mass
--     time is not a thing to be casual about.
--   * answer_feedback has a unique constraint on (search_id, card_key), so a
--     visitor votes once per card per search. WordPress guarded this with a
--     flag on a DOM node that every re-render destroyed.
--   * answer_searches.match_count is new, alongside result_count. One is what
--     the visitor saw, the other is how many cards matched. WordPress
--     conflated them and logged each in a different table.

CREATE TABLE "answer_cards" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "key" text NOT NULL,
    "title" text NOT NULL,
    "answer" text NOT NULL,
    "group" text DEFAULT '' NOT NULL,
    "triggers" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "links" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "moments" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "contact" text DEFAULT '' NOT NULL,
    "pastoral" boolean DEFAULT false NOT NULL,
    "activation" jsonb,
    "status" text DEFAULT 'draft' NOT NULL,
    "note" text DEFAULT '' NOT NULL,
    "source" text DEFAULT '' NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "last_edited_by" uuid REFERENCES "users"("id"),
    "last_edited_at" timestamp with time zone
);
--> statement-breakpoint

CREATE UNIQUE INDEX "answer_cards_key_uq" ON "answer_cards" ("key");
--> statement-breakpoint
CREATE INDEX "answer_cards_status_idx" ON "answer_cards" ("status");
--> statement-breakpoint

CREATE TABLE "answer_searches" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "query" text NOT NULL,
    "query_norm" text NOT NULL,
    "result_kind" text DEFAULT 'none' NOT NULL,
    "card_key" text,
    "result_count" smallint DEFAULT 0 NOT NULL,
    "match_count" smallint DEFAULT 0 NOT NULL,
    "clicked" boolean DEFAULT false NOT NULL,
    "clicked_url" text,
    "session_hash" text,
    "source" text DEFAULT 'widget' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX "answer_searches_created_idx" ON "answer_searches" ("created_at");
--> statement-breakpoint
CREATE INDEX "answer_searches_norm_idx" ON "answer_searches" ("query_norm");
--> statement-breakpoint
-- Dead ends are the hot path for both the dashboard and the weekly digest,
-- and they only ever ask for misses.
CREATE INDEX "answer_searches_dead_idx" ON "answer_searches" ("created_at")
    WHERE "result_kind" = 'none';
--> statement-breakpoint
CREATE INDEX "answer_searches_session_idx" ON "answer_searches" ("session_hash");
--> statement-breakpoint

CREATE TABLE "answer_feedback" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "card_key" text NOT NULL,
    "helpful" boolean NOT NULL,
    "query" text,
    "search_id" uuid REFERENCES "answer_searches"("id") ON DELETE SET NULL,
    "shown" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "position" smallint DEFAULT 0 NOT NULL,
    "result_count" smallint DEFAULT 0 NOT NULL,
    "wanted" text,
    "wanted_at" timestamp with time zone,
    "session_hash" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX "answer_feedback_card_idx" ON "answer_feedback" ("card_key");
--> statement-breakpoint
CREATE INDEX "answer_feedback_created_idx" ON "answer_feedback" ("created_at");
--> statement-breakpoint
CREATE INDEX "answer_feedback_helpful_idx" ON "answer_feedback" ("helpful", "created_at");
--> statement-breakpoint
CREATE INDEX "answer_feedback_wanted_at_idx" ON "answer_feedback" ("wanted_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "answer_feedback_once_uq" ON "answer_feedback" ("search_id", "card_key");
--> statement-breakpoint

-- Rate limiting lives in Postgres rather than Redis on purpose. Parish
-- traffic is a few thousand searches a month, and one fewer service to pay
-- for and remember is worth more here than the microseconds.
CREATE TABLE "answer_rate_limits" (
    "session_hash" text PRIMARY KEY NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "window_started_at" timestamp with time zone DEFAULT now() NOT NULL
);
