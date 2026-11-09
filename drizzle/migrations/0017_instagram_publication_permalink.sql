-- Optional URL returned by Instagram for a successfully published media item.
-- No backfill, ownership/policy changes or modification of existing posts.
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS instagram_permalink text;
COMMENT ON COLUMN public.scheduled_posts.instagram_permalink IS 'Actual permalink returned by the Instagram API after publishing; NULL when unavailable.';
