ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS cpl_limite_bom numeric,
  ADD COLUMN IF NOT EXISTS cpl_limite_alerta numeric;