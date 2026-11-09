-- Account type reported by Instagram (BUSINESS, MEDIA_CREATOR...), saved on connect and on test.
-- No backfill; existing rows fill in on the next test or reconnect.
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS account_type text;
COMMENT ON COLUMN public.social_accounts.account_type IS 'account_type returned by the Instagram API; NULL until reported.';
NOTIFY pgrst, 'reload schema';