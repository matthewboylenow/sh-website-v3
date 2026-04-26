-- Promote the seeded homepage "pastor welcome" image_text row into the
-- new dedicated pastor_welcome block kind. Idempotent: only rewrites
-- the row when it's still the seeded image_text row at position 1 with
-- the original copy intact, so an admin who has already edited it won't
-- be clobbered.

UPDATE "page_sections"
SET
  "kind" = 'pastor_welcome',
  "payload" = jsonb_build_object(
    'kind', 'pastor_welcome',
    'header', jsonb_build_object(
      'eyebrow', 'A word from your pastor',
      'heading', 'Welcome to Saint Helen',
      'align', 'left'
    ),
    'html', "payload" -> 'html',
    'photoBlobKey', NULLIF("payload" ->> 'blobKey', ''),
    'photoAlt', "payload" ->> 'alt',
    'mediaSide', COALESCE("payload" ->> 'imageSide', 'left'),
    'signatureName', 'Fr. Tom Quinn',
    'signatureRole', 'Pastor'
  )
WHERE "parent_kind" = 'homepage'
  AND "parent_id" = '00000000-0000-0000-0000-000000000000'
  AND "kind" = 'image_text'
  AND ("payload" ->> 'alt') = 'Pastor''s welcome';
