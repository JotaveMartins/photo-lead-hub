CREATE OR REPLACE FUNCTION public.admin_usage_metrics(month_start date)
RETURNS TABLE (
  user_id uuid,
  nome text,
  email text,
  leads bigint,
  pipeline bigint,
  tarefas bigint,
  inbox bigint,
  financeiro bigint,
  agenda bigint,
  clientes bigint,
  entregas bigint,
  contratos bigint,
  estudio bigint,
  ultimo_acesso timestamptz,
  acessou_no_mes boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH bounds AS (
  SELECT month_start::timestamptz AS s, (month_start + interval '1 month')::timestamptz AS e
),
base AS (
  SELECT p.user_id, p.nome, p.email, p.ultimo_acesso
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
)
SELECT
  b.user_id,
  b.nome,
  b.email,
  COALESCE((SELECT count(*) FROM public.leads l, bounds bo WHERE l.user_id = b.user_id AND l.created_at >= bo.s AND l.created_at < bo.e), 0),
  COALESCE((SELECT count(*) FROM public.lead_history h, bounds bo WHERE h.user_id = b.user_id AND h.source = 'manual' AND h.created_at >= bo.s AND h.created_at < bo.e), 0),
  COALESCE((SELECT count(*) FROM public.lead_tasks t, bounds bo WHERE t.user_id = b.user_id AND t.completed = true AND t.completed_at >= bo.s AND t.completed_at < bo.e), 0),
  COALESCE((SELECT count(*) FROM public.inbox_messages m, bounds bo WHERE m.user_id = b.user_id AND m.direction = 'outbound' AND m.created_at >= bo.s AND m.created_at < bo.e), 0),
  COALESCE((SELECT count(*) FROM public.cobrancas c, bounds bo WHERE c.user_id = b.user_id AND c.created_at >= bo.s AND c.created_at < bo.e), 0)
    + COALESCE((SELECT count(*) FROM public.despesas d, bounds bo WHERE d.user_id = b.user_id AND d.created_at >= bo.s AND d.created_at < bo.e), 0),
  COALESCE((SELECT count(*) FROM public.events ev, bounds bo WHERE ev.user_id = b.user_id AND ev.created_at >= bo.s AND ev.created_at < bo.e), 0),
  COALESCE((SELECT count(*) FROM public.clientes cl, bounds bo WHERE cl.user_id = b.user_id AND cl.created_at >= bo.s AND cl.created_at < bo.e), 0),
  COALESCE((SELECT count(*) FROM public.entregas en, bounds bo WHERE en.user_id = b.user_id AND (
      (en.created_at >= bo.s AND en.created_at < bo.e)
      OR (en.updated_at >= bo.s AND en.updated_at < bo.e)
    )), 0),
  COALESCE((SELECT count(*) FROM public.contratos ct, bounds bo WHERE ct.user_id = b.user_id AND ct.created_at >= bo.s AND ct.created_at < bo.e), 0),
  COALESCE((SELECT count(*) FROM public.projects pr, bounds bo WHERE pr.user_id = b.user_id AND pr.created_at >= bo.s AND pr.created_at < bo.e), 0)
    + COALESCE((SELECT count(*) FROM public.carousels ca, bounds bo WHERE ca.user_id = b.user_id AND ca.created_at >= bo.s AND ca.created_at < bo.e), 0),
  b.ultimo_acesso,
  (b.ultimo_acesso IS NOT NULL AND b.ultimo_acesso >= (SELECT s FROM bounds) AND b.ultimo_acesso < (SELECT e FROM bounds))
FROM base b;
$$;

REVOKE ALL ON FUNCTION public.admin_usage_metrics(date) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_usage_metrics(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_usage_metrics(date) TO service_role;