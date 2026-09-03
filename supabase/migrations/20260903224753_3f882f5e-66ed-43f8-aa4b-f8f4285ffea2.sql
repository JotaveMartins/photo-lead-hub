CREATE TABLE IF NOT EXISTS public.user_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dia date NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dia)
);

GRANT SELECT, INSERT, UPDATE ON public.user_access_log TO authenticated;
GRANT ALL ON public.user_access_log TO service_role;

ALTER TABLE public.user_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own access log"
  ON public.user_access_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own access log"
  ON public.user_access_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own access log"
  ON public.user_access_log FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_access_log_user_dia ON public.user_access_log (user_id, dia);

CREATE TRIGGER update_user_access_log_updated_at
  BEFORE UPDATE ON public.user_access_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP FUNCTION IF EXISTS public.admin_usage_metrics(date);

CREATE OR REPLACE FUNCTION public.admin_usage_metrics(month_start date)
 RETURNS TABLE(user_id uuid, nome text, email text, leads bigint, pipeline bigint, tarefas bigint, inbox bigint, financeiro bigint, agenda bigint, clientes bigint, entregas bigint, contratos bigint, estudio bigint, ultimo_acesso timestamp with time zone, dias_ativos bigint, acessou_no_mes boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
  SELECT
    b.user_id,
    b.nome,
    b.email,
    b.ultimo_acesso,
    COALESCE((SELECT count(*) FROM public.leads l, bounds bo WHERE l.user_id = b.user_id AND l.created_at >= bo.s AND l.created_at < bo.e), 0) AS leads,
    COALESCE((SELECT count(*) FROM public.lead_history h, bounds bo WHERE h.user_id = b.user_id AND h.source = 'manual' AND h.created_at >= bo.s AND h.created_at < bo.e), 0) AS pipeline,
    COALESCE((SELECT count(*) FROM public.lead_tasks t, bounds bo WHERE t.user_id = b.user_id AND t.completed = true AND t.completed_at >= bo.s AND t.completed_at < bo.e), 0) AS tarefas,
    COALESCE((SELECT count(*) FROM public.inbox_messages im, bounds bo WHERE im.user_id = b.user_id AND im.direction = 'outbound' AND im.created_at >= bo.s AND im.created_at < bo.e), 0) AS inbox,
    COALESCE((SELECT count(*) FROM public.cobrancas c, bounds bo WHERE c.user_id = b.user_id AND c.created_at >= bo.s AND c.created_at < bo.e), 0)
      + COALESCE((SELECT count(*) FROM public.despesas d, bounds bo WHERE d.user_id = b.user_id AND d.created_at >= bo.s AND d.created_at < bo.e), 0) AS financeiro,
    COALESCE((SELECT count(*) FROM public.events ev, bounds bo WHERE ev.user_id = b.user_id AND ev.created_at >= bo.s AND ev.created_at < bo.e), 0) AS agenda,
    COALESCE((SELECT count(*) FROM public.clientes cl, bounds bo WHERE cl.user_id = b.user_id AND cl.created_at >= bo.s AND cl.created_at < bo.e), 0) AS clientes,
    COALESCE((SELECT count(*) FROM public.entregas en, bounds bo WHERE en.user_id = b.user_id AND (
        (en.created_at >= bo.s AND en.created_at < bo.e)
        OR (en.updated_at >= bo.s AND en.updated_at < bo.e)
      )), 0) AS entregas,
    COALESCE((SELECT count(*) FROM public.contratos ct, bounds bo WHERE ct.user_id = b.user_id AND ct.created_at >= bo.s AND ct.created_at < bo.e), 0) AS contratos,
    COALESCE((SELECT count(*) FROM public.projects pr, bounds bo WHERE pr.user_id = b.user_id AND pr.created_at >= bo.s AND pr.created_at < bo.e), 0)
      + COALESCE((SELECT count(*) FROM public.carousels ca, bounds bo WHERE ca.user_id = b.user_id AND ca.created_at >= bo.s AND ca.created_at < bo.e), 0) AS estudio,
    COALESCE((SELECT count(*) FROM public.user_access_log al, bounds bo WHERE al.user_id = b.user_id AND al.dia >= bo.s::date AND al.dia < bo.e::date), 0) AS dias_ativos
  FROM base b
)
SELECT
  m.user_id, m.nome, m.email,
  m.leads, m.pipeline, m.tarefas, m.inbox, m.financeiro, m.agenda, m.clientes, m.entregas, m.contratos, m.estudio,
  m.ultimo_acesso,
  m.dias_ativos,
  CASE
    WHEN m.dias_ativos > 0 THEN true
    WHEN m.ultimo_acesso IS NOT NULL AND m.ultimo_acesso >= (SELECT s FROM bounds) THEN true
    WHEN (m.leads + m.pipeline + m.tarefas + m.financeiro + m.agenda + m.clientes + m.entregas + m.contratos + m.estudio) > 0 THEN true
    ELSE false
  END AS acessou_no_mes
FROM m;
$function$;