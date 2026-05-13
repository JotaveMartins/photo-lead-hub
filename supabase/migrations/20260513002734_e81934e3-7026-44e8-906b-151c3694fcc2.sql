ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS meta_ad_account_id text,
  ADD COLUMN IF NOT EXISTS cpl_limite_bom numeric,
  ADD COLUMN IF NOT EXISTS cpl_limite_alerta numeric;

ALTER TABLE public.clientes
  DROP COLUMN IF EXISTS meta_ad_account_id,
  DROP COLUMN IF EXISTS cpl_limite_bom,
  DROP COLUMN IF EXISTS cpl_limite_alerta;