-- Rename podcast_episode.payload.url → payload.feedUrl. Idempotent: only
-- runs when payload still has url and no feedUrl yet.

UPDATE "page_sections"
SET "payload" = (
    "payload" - 'url' || jsonb_build_object('feedUrl', "payload" ->> 'url')
)
WHERE "kind" = 'podcast_episode'
  AND ("payload" ? 'url')
  AND NOT ("payload" ? 'feedUrl');
