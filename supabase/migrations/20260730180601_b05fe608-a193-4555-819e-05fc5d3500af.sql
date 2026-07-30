CREATE TYPE public.entrega_etapa AS ENUM ('Ensaio Agendado', 'Ensaio Realizado', 'Prévia enviada', 'Em edição', 'Entregue');

CREATE TABLE public.entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  titulo text NOT NULL DEFAULT 'Entrega',
  etapa public.entrega_etapa NOT NULL DEFAULT 'Ensaio Agendado',
  data_ensaio date,
  data_previa_prevista date,
  data_entrega_prevista date,
  data_entrega_final date,
  link_galeria text,
  observacoes text,
  data_entrada_ensaio_agendado timestamptz DEFAULT now(),
  data_entrada_ensaio_realizado timestamptz,
  data_entrada_previa_enviada timestamptz,
  data_entrada_em_edicao timestamptz,
  data_entrada_entregue timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas TO authenticated;
GRANT ALL ON public.entregas TO service_role;

ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entregas" ON public.entregas FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own entregas" ON public.entregas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own entregas" ON public.entregas FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own entregas" ON public.entregas FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_entregas_user ON public.entregas(user_id);
CREATE INDEX idx_entregas_cliente ON public.entregas(cliente_id);

CREATE TRIGGER update_entregas_updated_at BEFORE UPDATE ON public.entregas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.zzz_track_entrega_stage_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.etapa IS DISTINCT FROM NEW.etapa THEN
    CASE NEW.etapa
      WHEN 'Ensaio Agendado' THEN
        IF NEW.data_entrada_ensaio_agendado IS NULL THEN NEW.data_entrada_ensaio_agendado = now(); END IF;
      WHEN 'Ensaio Realizado' THEN
        IF NEW.data_entrada_ensaio_realizado IS NULL THEN NEW.data_entrada_ensaio_realizado = now(); END IF;
      WHEN 'Prévia enviada' THEN
        IF NEW.data_entrada_previa_enviada IS NULL THEN NEW.data_entrada_previa_enviada = now(); END IF;
      WHEN 'Em edição' THEN
        IF NEW.data_entrada_em_edicao IS NULL THEN NEW.data_entrada_em_edicao = now(); END IF;
      WHEN 'Entregue' THEN
        IF NEW.data_entrada_entregue IS NULL THEN NEW.data_entrada_entregue = now(); END IF;
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER zzz_entregas_stage_dates BEFORE UPDATE ON public.entregas
FOR EACH ROW EXECUTE FUNCTION public.zzz_track_entrega_stage_dates();