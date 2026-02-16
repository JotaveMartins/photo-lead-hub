
CREATE OR REPLACE FUNCTION public.create_cadence_task_on_contato()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (OLD.iniciar_atendimento IS DISTINCT FROM NEW.iniciar_atendimento) AND NEW.iniciar_atendimento = true THEN
    NEW.status = 'Contato Iniciado';
    DELETE FROM public.lead_tasks WHERE lead_id = NEW.id AND is_cadence = true;
    INSERT INTO public.lead_tasks (lead_id, user_id, title, task_number, due_date, is_cadence)
    VALUES (NEW.id, NEW.user_id, '1º Entrar em contato', 1, (now() AT TIME ZONE 'America/Sao_Paulo')::date, true);
  END IF;
  RETURN NEW;
END;
$function$;
