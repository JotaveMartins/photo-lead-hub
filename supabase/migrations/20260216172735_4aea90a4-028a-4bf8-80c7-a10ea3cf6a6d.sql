
-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trg_delete_cadence_on_proposta ON public.leads;
DROP FUNCTION IF EXISTS public.delete_cadence_on_proposta();

-- Recreated expanded function
CREATE OR REPLACE FUNCTION public.delete_tasks_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Proposta Enviada: only delete cadence pending tasks
    IF NEW.status = 'Proposta Enviada' THEN
      DELETE FROM public.lead_tasks
      WHERE lead_id = NEW.id
        AND is_cadence = true
        AND completed = false;
    END IF;

    -- Contrato Enviado, Fechado Ganho, Fechado Perdido: delete ALL pending tasks
    IF NEW.status IN ('Contrato Enviado', 'Fechado Ganho', 'Fechado Perdido') THEN
      DELETE FROM public.lead_tasks
      WHERE lead_id = NEW.id
        AND completed = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger
CREATE TRIGGER trg_delete_tasks_on_status_change
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.delete_tasks_on_status_change();
