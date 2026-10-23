-- Preserve existing connection IDs and the scheduled posts referencing them.
-- Reconnecting a profile refreshes that profile; adding another creates a row.
DROP INDEX public.social_accounts_user_provider_idx;

CREATE UNIQUE INDEX social_accounts_user_provider_instagram_user_idx
ON public.social_accounts (user_id, provider, instagram_user_id);
