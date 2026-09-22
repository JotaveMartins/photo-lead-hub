ALTER TYPE public.entrega_etapa ADD VALUE IF NOT EXISTS 'Pronto para entrega';
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS data_entrada_pronto_para_entrega timestamp with time zone;