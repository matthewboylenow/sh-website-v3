-- Flip the homepage's "How can we serve you today?" card_grid block to
-- the new bento layout (2 large + 4 tiles). Idempotent: only updates
-- the row if the layout key is missing, so re-running won't clobber an
-- admin's manual choice.

UPDATE "page_sections"
SET "payload" = jsonb_set("payload", '{layout}', '"bento"')
WHERE "parent_kind" = 'homepage'
  AND "parent_id" = '00000000-0000-0000-0000-000000000000'
  AND "kind" = 'card_grid'
  AND ("payload" ->> 'layout') IS NULL;
