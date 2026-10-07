-- 1) Guard BEFORE: remove apenas o INSERT de histórico (mantém etapa inicial, validações e data_entrega_final)
CREATE OR REPLACE FUNCTION public.zzz_entrega_stage_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  st public.delivery_stages%ROWTYPE;
BEGIN
  -- Fallback: inserção sem stage_id usa a primeira etapa open da conta
  IF TG_OP = 'INSERT' AND NEW.stage_id IS NULL THEN
    SELECT * INTO st FROM public.delivery_stages
      WHERE user_id = NEW.user_id AND stage_role = 'open'
      ORDER BY position ASC LIMIT 1;
    IF st.id IS NULL THEN
      PERFORM public.ensure_default_delivery_stages(NEW.user_id);
      SELECT * INTO st FROM public.delivery_stages
        WHERE user_id = NEW.user_id AND stage_role = 'open'
        ORDER BY position ASC LIMIT 1;
    END IF;
    NEW.stage_id := st.id;
  END IF;

  IF NEW.stage_id IS NOT NULL THEN
    SELECT * INTO st FROM public.delivery_stages WHERE id = NEW.stage_id;
    IF st.id IS NULL THEN
      RAISE EXCEPTION 'Etapa de entrega inexistente.';
    END IF;
    IF st.user_id <> NEW.user_id THEN
      RAISE EXCEPTION 'A etapa pertence a outra conta.';
    END IF;
    IF st.stage_role = 'delivered' AND NEW.data_entrega_final IS NULL THEN
      NEW.data_entrega_final := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Histórico: função AFTER separada
CREATE OR REPLACE FUNCTION public.zzz_entrega_stage_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.stage_id IS NOT NULL THEN
      INSERT INTO public.delivery_stage_history (delivery_id, user_id, from_stage_id, to_stage_id)
      VALUES (NEW.id, NEW.user_id, NULL, NEW.stage_id);
    END IF;
  ELSIF NEW.stage_id IS DISTINCT FROM OLD.stage_id AND NEW.stage_id IS NOT NULL THEN
    INSERT INTO public.delivery_stage_history (delivery_id, user_id, from_stage_id, to_stage_id)
    VALUES (NEW.id, NEW.user_id, OLD.stage_id, NEW.stage_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Trigger AFTER (sem duplicar)
DROP TRIGGER IF EXISTS zzz_entrega_stage_history ON public.entregas;
CREATE TRIGGER zzz_entrega_stage_history
AFTER INSERT OR UPDATE OF stage_id ON public.entregas
FOR EACH ROW EXECUTE FUNCTION public.zzz_entrega_stage_history();