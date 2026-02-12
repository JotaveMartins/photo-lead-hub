
-- Add follow_up_4 and follow_up_5 columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_4 date;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_5 date;

-- Add per-stage date tracking columns (system-managed)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_entrada_novo_lead timestamptz DEFAULT now();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_entrada_contato_iniciado timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_entrada_proposta_enviada timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_entrada_follow_up timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_entrada_contrato_enviado timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_entrada_fechado_ganho timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_entrada_fechado_perdido timestamptz;

-- Rename data_pedido conceptually to "data_contato" - add new column and migrate
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_contato date;
UPDATE public.leads SET data_contato = data_pedido WHERE data_pedido IS NOT NULL;

-- Create trigger to auto-track stage entry dates
CREATE OR REPLACE FUNCTION public.track_lead_stage_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'Novo Lead' THEN NEW.data_entrada_novo_lead = now();
      WHEN 'Contato Iniciado' THEN NEW.data_entrada_contato_iniciado = now();
      WHEN 'Proposta Enviada' THEN NEW.data_entrada_proposta_enviada = now();
      WHEN 'Follow-up' THEN NEW.data_entrada_follow_up = now();
      WHEN 'Contrato Enviado' THEN NEW.data_entrada_contrato_enviado = now();
      WHEN 'Fechado Ganho' THEN NEW.data_entrada_fechado_ganho = now();
      WHEN 'Fechado Perdido' THEN NEW.data_entrada_fechado_perdido = now();
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS track_lead_stage_dates_trigger ON public.leads;
CREATE TRIGGER track_lead_stage_dates_trigger
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.track_lead_stage_dates();
