DROP INDEX IF EXISTS public.meta_daily_ads_unique;

UPDATE public.meta_daily_ads SET ad_id = 'name:' || ad_name WHERE ad_id IS NULL;

DELETE FROM public.meta_daily_ads a
USING public.meta_daily_ads b
WHERE a.date = b.date
  AND a.ad_account_id = b.ad_account_id
  AND a.ad_id = b.ad_id
  AND (a.updated_at, a.id) < (b.updated_at, b.id);

ALTER TABLE public.meta_daily_ads ALTER COLUMN ad_id SET NOT NULL;

CREATE UNIQUE INDEX meta_daily_ads_unique
  ON public.meta_daily_ads (date, ad_account_id, ad_id);