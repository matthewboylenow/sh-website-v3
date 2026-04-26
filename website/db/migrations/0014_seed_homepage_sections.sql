-- Seed page_sections rows that mirror the previously-hardcoded homepage
-- layout. Idempotent only on a fresh schema — run-once. The all-zeros
-- UUID is the singleton parentId for parentKind="homepage".

INSERT INTO "page_sections" ("parent_kind", "parent_id", "position", "kind", "payload") VALUES
  ('homepage', '00000000-0000-0000-0000-000000000000', 0, 'card_grid', '{"kind":"card_grid","header":{"heading":"How can we serve you today?","subheading":""},"columns":2,"cards":[{"title":"I''m new","summary":"A warm welcome, a guide to our Masses, and easy ways to meet people.","href":"/im-new"},{"title":"Watch online","summary":"Every weekend Mass livestreamed via Subsplash. Plus replays and pastor messages.","href":"/mass"},{"title":"Mass times","summary":"Weekend, weekday, and holy-day schedule.","href":"/mass"},{"title":"Mass intentions","summary":"Request a Mass intention or memorial offering.","href":"/contact"},{"title":"Ministries","summary":"Find a ministry that fits.","href":"/ministries"},{"title":"Give","summary":"Support the parish — weekly, one-time, or planned.","href":"/give"}]}'::jsonb),

  ('homepage', '00000000-0000-0000-0000-000000000000', 1, 'image_text', '{"kind":"image_text","header":{"heading":""},"blobKey":"","alt":"Pastor''s welcome","html":"<p><strong>A word from Fr. Tom.</strong> A short welcome from our pastor — his invitation to visit, what to expect on a Sunday, and why we think you''ll feel at home here.</p>","imageSide":"left"}'::jsonb),

  ('homepage', '00000000-0000-0000-0000-000000000000', 2, 'featured_ministries', '{"kind":"featured_ministries","header":{"heading":"Find your place","subheading":"Every ministry at Saint Helen — from contemplative prayer to hands-on outreach. Take 60 seconds and we''ll help you find your fit."},"mode":"spotlight","count":2,"tone":"navy","ctaLabel":"Browse all ministries","ctaHref":"/ministries"}'::jsonb),

  ('homepage', '00000000-0000-0000-0000-000000000000', 3, 'featured_events', '{"kind":"featured_events","header":{"heading":"Featured events","subheading":"What''s happening across the parish."},"count":4,"ctaLabel":"View all events","ctaHref":"/events"}'::jsonb),

  ('homepage', '00000000-0000-0000-0000-000000000000', 4, 'callout_banner', '{"kind":"callout_banner","header":{"heading":""},"tag":"Every Sunday","title":"The Weekly Bulletin","body":"Mass intentions, ministry updates, and what''s happening this week.","ctaLabel":"Open bulletin","ctaHref":"/bulletin","tone":"gold"}'::jsonb),

  ('homepage', '00000000-0000-0000-0000-000000000000', 5, 'callout_banner', '{"kind":"callout_banner","header":{"heading":""},"tag":"Stewardship","title":"Support our mission","body":"Every gift — large or small, one-time or weekly — supports the worship, service, and discipleship that happens here every day.","ctaLabel":"Give now","ctaHref":"/give","tone":"navy"}'::jsonb);
