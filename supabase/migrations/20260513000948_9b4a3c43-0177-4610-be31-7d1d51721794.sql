
-- Add meta_ad_account_id to clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS meta_ad_account_id text;
CREATE INDEX IF NOT EXISTS idx_clientes_meta_ad_account_id ON public.clientes (meta_ad_account_id);

-- Create meta_daily_ads
CREATE TABLE IF NOT EXISTS public.meta_daily_ads (
  id                              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                       uuid,
  client_id                       uuid,
  date                            date        NOT NULL,
  ad_account_id                   text        NOT NULL,
  campaign_id                     text,
  campaign_name                   text        NOT NULL,
  adset_id                        text,
  adset_name                      text        NOT NULL,
  ad_id                           text,
  ad_name                         text        NOT NULL,
  spend                           numeric     NOT NULL DEFAULT 0,
  impressions                     integer     NOT NULL DEFAULT 0,
  reach                           integer     NOT NULL DEFAULT 0,
  clicks                          integer     NOT NULL DEFAULT 0,
  ctr                             numeric,
  cpm                             numeric,
  messaging_conversations_started integer     NOT NULL DEFAULT 0,
  cost_per_messaging_conversation numeric,
  campaign_objective              text,
  result_type                     text,
  results                         integer     NOT NULL DEFAULT 0,
  cost_per_result                 numeric,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS meta_daily_ads_unique
  ON public.meta_daily_ads (date, ad_account_id, campaign_name, adset_name, ad_name);
CREATE INDEX IF NOT EXISTS idx_meta_daily_ads_date ON public.meta_daily_ads (date);
CREATE INDEX IF NOT EXISTS idx_meta_daily_ads_account_date ON public.meta_daily_ads (ad_account_id, date);
CREATE INDEX IF NOT EXISTS idx_meta_daily_ads_client ON public.meta_daily_ads (client_id);

ALTER TABLE public.meta_daily_ads ENABLE ROW LEVEL SECURITY;

-- Only admins can read/manage meta_daily_ads (MVP: admin only)
CREATE POLICY "Admins can view meta_daily_ads"
  ON public.meta_daily_ads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert meta_daily_ads"
  ON public.meta_daily_ads FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update meta_daily_ads"
  ON public.meta_daily_ads FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete meta_daily_ads"
  ON public.meta_daily_ads FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_meta_daily_ads_updated_at
  BEFORE UPDATE ON public.meta_daily_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
