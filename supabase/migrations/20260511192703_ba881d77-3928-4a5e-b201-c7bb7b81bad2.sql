CREATE OR REPLACE FUNCTION public.delete_tasks_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Proposta Enviada or Follow-up: delete cadence pending tasks only
    IF NEW.status IN ('Proposta Enviada', 'Follow-up') THEN
      DELETE FROM public.lead_tasks
      WHERE lead_id = NEW.id
        AND is_cadence = true
        AND completed = false;
    END IF;

    -- Contrato Enviado, Fechado Ganho: delete ALL pending tasks
    -- (Fechado Perdido removed: handled by app so user can choose)
    IF NEW.status IN ('Contrato Enviado', 'Fechado Ganho') THEN
      DELETE FROM public.lead_tasks
      WHERE lead_id = NEW.id
        AND completed = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;