
-- Drop the old trigger (fires too early due to alphabetical ordering)
DROP TRIGGER IF EXISTS track_lead_stage_dates_trigger ON public.leads;

-- Update the function to also set proposta_enviada when going to Follow-up
CREATE OR REPLACE FUNCTION public.track_lead_stage_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'Novo Lead' THEN NEW.data_entrada_novo_lead = now();
      WHEN 'Contato Iniciado' THEN NEW.data_entrada_contato_iniciado = now();
      WHEN 'Proposta Enviada' THEN NEW.data_entrada_proposta_enviada = now();
      WHEN 'Follow-up' THEN
        NEW.data_entrada_follow_up = now();
        -- Also record proposta_enviada if not yet set (code skips directly to Follow-up)
        IF NEW.data_entrada_proposta_enviada IS NULL THEN
          NEW.data_entrada_proposta_enviada = now();
        END IF;
      WHEN 'Contrato Enviado' THEN NEW.data_entrada_contrato_enviado = now();
      WHEN 'Fechado Ganho' THEN NEW.data_entrada_fechado_ganho = now();
      WHEN 'Fechado Perdido' THEN NEW.data_entrada_fechado_perdido = now();
      ELSE NULL;
    END CASE;
  END IF;

  -- Also track Contato Iniciado when iniciar_atendimento is toggled
  -- (since the cadence trigger sets status in another BEFORE trigger)
  IF (OLD.iniciar_atendimento IS DISTINCT FROM NEW.iniciar_atendimento) 
     AND NEW.iniciar_atendimento = true 
     AND NEW.data_entrada_contato_iniciado IS NULL THEN
    NEW.data_entrada_contato_iniciado = now();
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate with a name that sorts LAST (after all other triggers)
CREATE TRIGGER zzz_track_lead_stage_dates
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.track_lead_stage_dates();
