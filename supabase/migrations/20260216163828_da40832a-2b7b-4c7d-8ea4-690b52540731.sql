
-- Add "iniciar_atendimento" boolean to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS iniciar_atendimento boolean NOT NULL DEFAULT false;

-- Drop old trigger that fires on status change to "Contato Iniciado"
DROP TRIGGER IF EXISTS trigger_cadence_on_contato ON public.leads;

-- Update the function: now fires when iniciar_atendimento goes from false to true
CREATE OR REPLACE FUNCTION public.create_cadence_task_on_contato()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- When "iniciar_atendimento" is toggled to true
  IF (OLD.iniciar_atendimento IS DISTINCT FROM NEW.iniciar_atendimento) AND NEW.iniciar_atendimento = true THEN
    -- Move to "Contato Iniciado" automatically
    NEW.status = 'Contato Iniciado';
    -- Delete any existing cadence tasks for this lead
    DELETE FROM public.lead_tasks WHERE lead_id = NEW.id AND is_cadence = true;
    -- Create first contact task
    INSERT INTO public.lead_tasks (lead_id, user_id, title, task_number, due_date, is_cadence)
    VALUES (NEW.id, NEW.user_id, 'Entrar em contato (1ª tentativa)', 1, CURRENT_DATE, true);
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate trigger on leads for iniciar_atendimento
CREATE TRIGGER trigger_cadence_on_atendimento
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.create_cadence_task_on_contato();
