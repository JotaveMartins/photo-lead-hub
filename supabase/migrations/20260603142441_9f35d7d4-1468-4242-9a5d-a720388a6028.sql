ALTER TABLE public.despesas
  ADD COLUMN IF NOT EXISTS recorrencia_frequencia text,
  ADD COLUMN IF NOT EXISTS recorrencia_intervalo_dias integer;

ALTER TABLE public.despesas
  DROP CONSTRAINT IF EXISTS despesas_recorrencia_frequencia_check;

ALTER TABLE public.despesas
  ADD CONSTRAINT despesas_recorrencia_frequencia_check
  CHECK (recorrencia_frequencia IS NULL OR recorrencia_frequencia IN ('mensal','anual','personalizada'));