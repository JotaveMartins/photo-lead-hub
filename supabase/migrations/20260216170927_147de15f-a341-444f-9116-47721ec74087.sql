
-- Delete pending cadence tasks when lead moves to "Proposta Enviada"
CREATE OR REPLACE FUNCTION public.delete_cadence_on_proposta()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'Proposta Enviada' THEN
    DELETE FROM public.lead_tasks
    WHERE lead_id = NEW.id
      AND is_cadence = true
      AND completed = false;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_delete_cadence_on_proposta
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_cadence_on_proposta();
