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
      WHEN 'Pronto para entrega' THEN
        IF NEW.data_entrada_pronto_para_entrega IS NULL THEN NEW.data_entrada_pronto_para_entrega = now(); END IF;
      WHEN 'Entregue' THEN
        IF NEW.data_entrada_entregue IS NULL THEN NEW.data_entrada_entregue = now(); END IF;
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$;