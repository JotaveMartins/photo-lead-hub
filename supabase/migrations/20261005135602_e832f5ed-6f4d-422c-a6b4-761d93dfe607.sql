CREATE OR REPLACE FUNCTION public.track_lead_stage_dates()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'Novo Lead' THEN IF NEW.data_entrada_novo_lead IS NULL THEN NEW.data_entrada_novo_lead = now(); END IF;
      WHEN 'Contato Iniciado' THEN IF NEW.data_entrada_contato_iniciado IS NULL THEN NEW.data_entrada_contato_iniciado = now(); END IF;
      WHEN 'Triagem Feita' THEN IF NEW.data_entrada_triagem_feita IS NULL THEN NEW.data_entrada_triagem_feita = now(); END IF;
      WHEN 'Proposta Enviada' THEN IF NEW.data_entrada_proposta_enviada IS NULL THEN NEW.data_entrada_proposta_enviada = now(); END IF;
      WHEN 'Follow-up' THEN
        IF NEW.data_entrada_follow_up IS NULL THEN NEW.data_entrada_follow_up = now(); END IF;
        IF NEW.data_entrada_proposta_enviada IS NULL THEN NEW.data_entrada_proposta_enviada = now(); END IF;
      WHEN 'Contrato Enviado' THEN IF NEW.data_entrada_contrato_enviado IS NULL THEN NEW.data_entrada_contrato_enviado = now(); END IF;
      WHEN 'Fechado Ganho' THEN IF NEW.data_entrada_fechado_ganho IS NULL THEN NEW.data_entrada_fechado_ganho = now(); END IF;
      WHEN 'Fechado Perdido' THEN IF NEW.data_entrada_fechado_perdido IS NULL THEN NEW.data_entrada_fechado_perdido = now(); END IF;
      ELSE NULL;
    END CASE;
    IF NEW.status <> 'Fechado Ganho' THEN NEW.data_entrada_fechado_ganho = NULL; END IF;
    IF NEW.status <> 'Fechado Perdido' THEN NEW.data_entrada_fechado_perdido = NULL; END IF;
  END IF;
  IF (OLD.iniciar_atendimento IS DISTINCT FROM NEW.iniciar_atendimento)
     AND NEW.iniciar_atendimento = true AND NEW.data_entrada_contato_iniciado IS NULL THEN
    NEW.data_entrada_contato_iniciado = now();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_usage_metrics(month_start date)
 RETURNS TABLE(user_id uuid, nome text, email text, leads bigint, pipeline bigint, tarefas bigint, inbox bigint, financeiro bigint, agenda bigint, clientes bigint, entregas bigint, contratos bigint, estudio bigint, ultimo_acesso timestamp with time zone, dias_ativos bigint, acessou_no_mes boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
WITH bounds AS (
  SELECT month_start::timestamptz AS s, (month_start + interval '1 month')::timestamptz AS e
),
base AS (
  SELECT p.user_id, p.nome, p.email, p.ultimo_acesso
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
),
m AS (
  SELECT b.user_id, b.nome, b.email, b.ultimo_acesso,
    COALESCE((SELECT count(*) FROM public.leads l, bounds bo WHERE l.user_id = b.user_id AND l.created_via <> 'inbox_auto' AND l.created_at >= bo.s AND l.created_at < bo.e), 0) AS leads,
    COALESCE((SELECT count(*) FROM public.lead_history h, bounds bo WHERE h.user_id = b.user_id
        AND h.field_name <> '__created__' AND h.field_name NOT LIKE 'data_entrada_%'
        AND h.created_at >= bo.s AND h.created_at < bo.e), 0) AS pipeline,
    COALESCE((SELECT count(*) FROM public.lead_tasks t, bounds bo WHERE t.user_id = b.user_id AND t.completed = true AND t.completed_at >= bo.s AND t.completed_at < bo.e), 0) AS tarefas,
    COALESCE((SELECT count(*) FROM public.inbox_messages im, bounds bo WHERE im.user_id = b.user_id AND im.direction = 'outbound' AND im.created_at >= bo.s AND im.created_at < bo.e), 0) AS inbox,
    COALESCE((SELECT count(*) FROM public.cobrancas c, bounds bo WHERE c.user_id = b.user_id AND c.created_at >= bo.s AND c.created_at < bo.e), 0)
      + COALESCE((SELECT count(*) FROM public.despesas d, bounds bo WHERE d.user_id = b.user_id AND d.created_at >= bo.s AND d.created_at < bo.e), 0) AS financeiro,
    COALESCE((SELECT count(*) FROM public.events ev, bounds bo WHERE ev.user_id = b.user_id AND ev.created_at >= bo.s AND ev.created_at < bo.e), 0) AS agenda,
    COALESCE((SELECT count(*) FROM public.clientes cl, bounds bo WHERE cl.user_id = b.user_id AND cl.created_at >= bo.s AND cl.created_at < bo.e), 0) AS clientes,
    COALESCE((SELECT count(*) FROM public.entregas en, bounds bo WHERE en.user_id = b.user_id AND ((en.created_at >= bo.s AND en.created_at < bo.e) OR (en.updated_at >= bo.s AND en.updated_at < bo.e))), 0) AS entregas,
    COALESCE((SELECT count(*) FROM public.contratos ct, bounds bo WHERE ct.user_id = b.user_id AND ct.created_at >= bo.s AND ct.created_at < bo.e), 0) AS contratos,
    COALESCE((SELECT count(*) FROM public.projects pr, bounds bo WHERE pr.user_id = b.user_id AND pr.created_at >= bo.s AND pr.created_at < bo.e), 0)
      + COALESCE((SELECT count(*) FROM public.carousels ca, bounds bo WHERE ca.user_id = b.user_id AND ca.created_at >= bo.s AND ca.created_at < bo.e), 0) AS estudio,
    COALESCE((SELECT count(*) FROM public.user_access_log al, bounds bo WHERE al.user_id = b.user_id AND al.dia >= bo.s::date AND al.dia < bo.e::date), 0) AS dias_ativos
  FROM base b
)
SELECT m.user_id, m.nome, m.email,
  m.leads, m.pipeline, m.tarefas, m.inbox, m.financeiro, m.agenda, m.clientes, m.entregas, m.contratos, m.estudio,
  m.ultimo_acesso, m.dias_ativos,
  (m.dias_ativos > 0 OR (m.ultimo_acesso IS NOT NULL AND m.ultimo_acesso >= (SELECT s FROM bounds) AND m.ultimo_acesso < (SELECT e FROM bounds))) AS acessou_no_mes
FROM m;
$function$;