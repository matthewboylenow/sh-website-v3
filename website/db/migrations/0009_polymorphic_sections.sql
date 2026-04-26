-- Polymorphic refactor of ministry_sections into page_sections.
-- Backfills parent_kind = 'ministry' for existing rows; renames the
-- ministry_id column to parent_id; drops the FK to ministries (parent_id
-- is now polymorphic — application code handles cascade on parent delete);
-- swaps the indexes.

ALTER TABLE "ministry_sections" RENAME TO "page_sections";--> statement-breakpoint

ALTER TABLE "page_sections"
  DROP CONSTRAINT IF EXISTS "ministry_sections_ministry_id_ministries_id_fk";--> statement-breakpoint

ALTER TABLE "page_sections" RENAME COLUMN "ministry_id" TO "parent_id";--> statement-breakpoint

ALTER TABLE "page_sections"
  ADD COLUMN "parent_kind" text NOT NULL DEFAULT 'ministry';--> statement-breakpoint

DROP INDEX IF EXISTS "ministry_sections_ministry_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "ministry_sections_position_idx";--> statement-breakpoint

CREATE INDEX "page_sections_parent_idx"
  ON "page_sections" ("parent_kind", "parent_id");--> statement-breakpoint
CREATE INDEX "page_sections_position_idx"
  ON "page_sections" ("position");
