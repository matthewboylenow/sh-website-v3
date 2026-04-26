-- Convert legacy `description` columns on ministries + formation_pages
-- into a leading rich_text page_section. Idempotent: only runs for rows
-- with a non-empty description; sets description to NULL after the move
-- so re-running doesn't duplicate the block.
--
-- Existing sections shift down by +1 to make room at position 0.

DO $$
DECLARE
  m RECORD;
BEGIN
  FOR m IN
    SELECT id, description FROM ministries
    WHERE description IS NOT NULL AND length(trim(description)) > 0
  LOOP
    -- Shift any existing sections to make room at position 0.
    UPDATE page_sections
       SET position = position + 1
     WHERE parent_kind = 'ministry'
       AND parent_id = m.id;

    -- Insert the description as a rich_text block at position 0.
    INSERT INTO page_sections (parent_kind, parent_id, position, kind, payload)
    VALUES (
      'ministry',
      m.id,
      0,
      'rich_text',
      jsonb_build_object('kind', 'rich_text', 'html', m.description)
    );

    -- Null the legacy column so re-runs are no-ops.
    UPDATE ministries SET description = NULL WHERE id = m.id;
  END LOOP;

  FOR m IN
    SELECT id, description FROM formation_pages
    WHERE description IS NOT NULL AND length(trim(description)) > 0
  LOOP
    UPDATE page_sections
       SET position = position + 1
     WHERE parent_kind = 'formation'
       AND parent_id = m.id;

    INSERT INTO page_sections (parent_kind, parent_id, position, kind, payload)
    VALUES (
      'formation',
      m.id,
      0,
      'rich_text',
      jsonb_build_object('kind', 'rich_text', 'html', m.description)
    );

    UPDATE formation_pages SET description = NULL WHERE id = m.id;
  END LOOP;
END $$;

-- Add ministryId FK to events. Nullable because most parish-wide events
-- don't belong to a single ministry.
ALTER TABLE "events"
  ADD COLUMN "ministry_id" uuid REFERENCES "ministries"("id") ON DELETE SET NULL;
CREATE INDEX "events_ministry_id_idx" ON "events"("ministry_id");
