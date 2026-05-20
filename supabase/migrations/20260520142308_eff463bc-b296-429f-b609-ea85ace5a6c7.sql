CREATE OR REPLACE FUNCTION public.track_lead_stage_dates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'Novo Lead' THEN
        IF NEW.data_entrada_novo_lead IS NULL THEN
          NEW.data_entrada_novo_lead = now();
        END IF;
      WHEN 'Contato Iniciado' THEN
        IF NEW.data_entrada_contato_iniciado IS NULL THEN
          NEW.data_entrada_contato_iniciado = now();
        END IF;
      WHEN 'Proposta Enviada' THEN
        IF NEW.data_entrada_proposta_enviada IS NULL THEN
          NEW.data_entrada_proposta_enviada = now();
        END IF;
      WHEN 'Follow-up' THEN
        IF NEW.data_entrada_follow_up IS NULL THEN
          NEW.data_entrada_follow_up = now();
        END IF;
        IF NEW.data_entrada_proposta_enviada IS NULL THEN
          NEW.data_entrada_proposta_enviada = now();
        END IF;
      WHEN 'Contrato Enviado' THEN
        IF NEW.data_entrada_contrato_enviado IS NULL THEN
          NEW.data_entrada_contrato_enviado = now();
        END IF;
      WHEN 'Fechado Ganho' THEN
        IF NEW.data_entrada_fechado_ganho IS NULL THEN
          NEW.data_entrada_fechado_ganho = now();
        END IF;
      WHEN 'Fechado Perdido' THEN
        IF NEW.data_entrada_fechado_perdido IS NULL THEN
          NEW.data_entrada_fechado_perdido = now();
        END IF;
      ELSE NULL;
    END CASE;
  END IF;

  IF (OLD.iniciar_atendimento IS DISTINCT FROM NEW.iniciar_atendimento)
     AND NEW.iniciar_atendimento = true
     AND NEW.data_entrada_contato_iniciado IS NULL THEN
    NEW.data_entrada_contato_iniciado = now();
  END IF;

  RETURN NEW;
END;
$function$;