DROP INDEX IF EXISTS public.meta_daily_ads_unique;

DELETE FROM public.meta_daily_ads a
USING public.meta_daily_ads b
WHERE a.date = b.date
  AND a.ad_account_id = b.ad_account_id
  AND COALESCE(a.ad_id, a.ad_name) = COALESCE(b.ad_id, b.ad_name)
  AND (a.updated_at, a.id) < (b.updated_at, b.id);

CREATE UNIQUE INDEX meta_daily_ads_unique
  ON public.meta_daily_ads (date, ad_account_id, (COALESCE(ad_id, ad_name)));