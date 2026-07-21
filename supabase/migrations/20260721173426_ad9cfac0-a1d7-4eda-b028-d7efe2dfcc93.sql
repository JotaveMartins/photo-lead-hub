
-- 1. Add source column to lead_history
ALTER TABLE public.lead_history
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual','automatic'));

-- 2. Add created_via to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS created_via text NOT NULL DEFAULT 'manual'
  CHECK (created_via IN ('manual','inbox_auto'));

-- 3. Update existing triggers to mark subsequent history entries as automatic
CREATE OR REPLACE FUNCTION public.track_lead_stage_dates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.history_source', 'automatic', true);

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'Novo Lead' THEN
        IF NEW.data_entrada_novo_lead IS NULL THEN NEW.data_entrada_novo_lead = now(); END IF;
      WHEN 'Contato Iniciado' THEN
        IF NEW.data_entrada_contato_iniciado IS NULL THEN NEW.data_entrada_contato_iniciado = now(); END IF;
      WHEN 'Triagem Feita' THEN
        IF NEW.data_entrada_triagem_feita IS NULL THEN NEW.data_entrada_triagem_feita = now(); END IF;
      WHEN 'Proposta Enviada' THEN
        IF NEW.data_entrada_proposta_enviada IS NULL THEN NEW.data_entrada_proposta_enviada = now(); END IF;
      WHEN 'Follow-up' THEN
        IF NEW.data_entrada_follow_up IS NULL THEN NEW.data_entrada_follow_up = now(); END IF;
        IF NEW.data_entrada_proposta_enviada IS NULL THEN NEW.data_entrada_proposta_enviada = now(); END IF;
      WHEN 'Contrato Enviado' THEN
        IF NEW.data_entrada_contrato_enviado IS NULL THEN NEW.data_entrada_contrato_enviado = now(); END IF;
      WHEN 'Fechado Ganho' THEN
        IF NEW.data_entrada_fechado_ganho IS NULL THEN NEW.data_entrada_fechado_ganho = now(); END IF;
      WHEN 'Fechado Perdido' THEN
        IF NEW.data_entrada_fechado_perdido IS NULL THEN NEW.data_entrada_fechado_perdido = now(); END IF;
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

CREATE OR REPLACE FUNCTION public.create_cadence_task_on_contato()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (OLD.iniciar_atendimento IS DISTINCT FROM NEW.iniciar_atendimento) AND NEW.iniciar_atendimento = true THEN
    PERFORM set_config('app.history_source', 'automatic', true);
    NEW.status = 'Contato Iniciado';
    DELETE FROM public.lead_tasks WHERE lead_id = NEW.id AND is_cadence = true;
    INSERT INTO public.lead_tasks (lead_id, user_id, title, task_number, due_date, is_cadence)
    VALUES (NEW.id, NEW.user_id, '1º Entrar em contato', 1, (now() AT TIME ZONE 'America/Sao_Paulo')::date, true);
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. AFTER UPDATE trigger: capture field changes into lead_history
CREATE OR REPLACE FUNCTION public.zzz_track_lead_field_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  src text;
  labels jsonb := jsonb_build_object(
    'nome','Nome',
    'whatsapp','WhatsApp',
    'interesse','Interesse',
    'origem','Origem',
    'valor','Valor',
    'data_evento','Data do Evento',
    'data_contato','Data do Contato',
    'data_proposta','Data da Proposta',
    'package_id','Pacote',
    'status','Status',
    'motivo_perda','Motivo da Perda',
    'observacao_perda','Observação da Perda',
    'iniciar_atendimento','Iniciar Atendimento',
    'data_entrada_novo_lead','Entrada em Novo Lead',
    'data_entrada_contato_iniciado','Entrada em Contato Iniciado',
    'data_entrada_triagem_feita','Entrada em Triagem Feita',
    'data_entrada_proposta_enviada','Entrada em Proposta Enviada',
    'data_entrada_follow_up','Entrada em Follow-up',
    'data_entrada_contrato_enviado','Entrada em Contrato Enviado',
    'data_entrada_fechado_ganho','Entrada em Fechado Ganho',
    'data_entrada_fechado_perdido','Entrada em Fechado Perdido'
  );
  k text;
  ov text;
  nv text;
  old_j jsonb := to_jsonb(OLD);
  new_j jsonb := to_jsonb(NEW);
BEGIN
  src := COALESCE(NULLIF(current_setting('app.history_source', true), ''), 'manual');

  FOR k IN SELECT jsonb_object_keys(labels) LOOP
    ov := NULLIF(old_j->>k, '');
    nv := NULLIF(new_j->>k, '');
    IF ov IS DISTINCT FROM nv THEN
      INSERT INTO public.lead_history (lead_id, user_id, field_name, field_label, old_value, new_value, source)
      VALUES (NEW.id, NEW.user_id, k, labels->>k, ov, nv, src);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zzz_track_lead_field_changes ON public.leads;
CREATE TRIGGER zzz_track_lead_field_changes
AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.zzz_track_lead_field_changes();

-- 5. AFTER INSERT trigger: "Lead criado" entry
CREATE OR REPLACE FUNCTION public.zzz_lead_created_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE src text;
BEGIN
  src := CASE WHEN NEW.created_via = 'inbox_auto' THEN 'automatic' ELSE 'manual' END;
  INSERT INTO public.lead_history (lead_id, user_id, field_name, field_label, old_value, new_value, source)
  VALUES (NEW.id, NEW.user_id, '__created__', 'Lead criado', NULL,
          CASE WHEN NEW.created_via = 'inbox_auto' THEN 'via Inbox' ELSE 'manualmente' END,
          src);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zzz_lead_created_history ON public.leads;
CREATE TRIGGER zzz_lead_created_history
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.zzz_lead_created_history();
