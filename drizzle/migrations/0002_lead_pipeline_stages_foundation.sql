-- ============================================================
-- Sprint 01: fundação de etapas personalizadas do Funil de Leads
-- Compatibilidade total: leads.status e enum lead_status intactos
-- ============================================================

-- 3) TABELA pipeline_stages
CREATE TABLE public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color_key text NOT NULL,
  position integer NOT NULL,
  stage_role text NOT NULL CHECK (stage_role IN ('lead','open','proposal','won','lost')),
  legacy_status public.lead_status NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pipeline_stages TO authenticated;
GRANT ALL ON public.pipeline_stages TO service_role;

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pipeline stages"
  ON public.pipeline_stages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5) Invariantes de papel
CREATE UNIQUE INDEX pipeline_stages_one_lead_per_user ON public.pipeline_stages (user_id) WHERE stage_role = 'lead';
CREATE UNIQUE INDEX pipeline_stages_one_won_per_user ON public.pipeline_stages (user_id) WHERE stage_role = 'won';
CREATE UNIQUE INDEX pipeline_stages_one_lost_per_user ON public.pipeline_stages (user_id) WHERE stage_role = 'lost';
CREATE UNIQUE INDEX pipeline_stages_one_proposal_per_user ON public.pipeline_stages (user_id) WHERE stage_role = 'proposal';
-- 6) legacy_status único por conta
CREATE UNIQUE INDEX pipeline_stages_unique_legacy_per_user ON public.pipeline_stages (user_id, legacy_status) WHERE legacy_status IS NOT NULL;

-- 9/11) Função de provisionamento idempotente, acesso restrito
CREATE OR REPLACE FUNCTION public.ensure_default_pipeline_stages(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.pipeline_stages (user_id, name, color_key, position, stage_role, legacy_status)
  SELECT * FROM (VALUES
    (_user_id, 'Novo Lead',        'stage-1',       0, 'lead',     'Novo Lead'::public.lead_status),
    (_user_id, 'Contato Iniciado', 'stage-2',       1, 'open',     'Contato Iniciado'::public.lead_status),
    (_user_id, 'Triagem Feita',    'stage-3',       2, 'open',     'Triagem Feita'::public.lead_status),
    (_user_id, 'Proposta Enviada', 'stage-4',       3, 'proposal', 'Proposta Enviada'::public.lead_status),
    (_user_id, 'Follow-up',        'stage-5',       4, 'open',     'Follow-up'::public.lead_status),
    (_user_id, 'Contrato Enviado', 'stage-6',       5, 'open',     'Contrato Enviado'::public.lead_status),
    (_user_id, 'Fechado Ganho',    'status-success',6, 'won',      'Fechado Ganho'::public.lead_status),
    (_user_id, 'Fechado Perdido',  'status-danger', 7, 'lost',     'Fechado Perdido'::public.lead_status)
  ) AS v(user_id, name, color_key, position, stage_role, legacy_status)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps
    WHERE ps.user_id = v.user_id AND ps.legacy_status = v.legacy_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_default_pipeline_stages(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_default_pipeline_stages(uuid) TO service_role;

-- 10) Novas contas: provisiona ao criar profile
CREATE OR REPLACE FUNCTION public.zzz_provision_pipeline_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.ensure_default_pipeline_stages(NEW.user_id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zzz_provision_pipeline_stages ON public.profiles;
CREATE TRIGGER zzz_provision_pipeline_stages
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.zzz_provision_pipeline_stages();

-- Provisiona contas existentes
SELECT public.ensure_default_pipeline_stages(user_id) FROM public.profiles;

-- 13) leads.stage_id
ALTER TABLE public.leads ADD COLUMN stage_id uuid REFERENCES public.pipeline_stages(id);

-- 14) Backfill stage_id via legacy_status da mesma conta
UPDATE public.leads l
SET stage_id = ps.id
FROM public.pipeline_stages ps
WHERE ps.user_id = l.user_id
  AND ps.legacy_status = l.status
  AND l.stage_id IS NULL;

-- 15/16/17) Sync status -> stage_id + integridade entre contas (BEFORE)
CREATE OR REPLACE FUNCTION public.zzz_lead_stage_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  st public.pipeline_stages%ROWTYPE;
BEGIN
  -- stage_id sempre reflete status nesta fase de compatibilidade
  SELECT * INTO st FROM public.pipeline_stages
    WHERE user_id = NEW.user_id AND legacy_status = NEW.status;
  IF st.id IS NULL THEN
    PERFORM public.ensure_default_pipeline_stages(NEW.user_id);
    SELECT * INTO st FROM public.pipeline_stages
      WHERE user_id = NEW.user_id AND legacy_status = NEW.status;
  END IF;
  IF st.id IS NULL THEN
    RAISE EXCEPTION 'Etapa de pipeline inexistente para o status % nesta conta.', NEW.status;
  END IF;
  NEW.stage_id := st.id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zzz_lead_stage_sync ON public.leads;
CREATE TRIGGER zzz_lead_stage_sync
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.zzz_lead_stage_sync();

-- 19) TABELA lead_stage_history
CREATE TABLE public.lead_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  from_stage_id uuid NULL REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id uuid NULL REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  from_stage_name text NULL,
  to_stage_name text NOT NULL,
  from_stage_role text NULL,
  to_stage_role text NOT NULL,
  entered_at timestamptz NOT NULL,
  source text NOT NULL CHECK (source IN ('legacy_backfill','runtime')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lead_stage_history_lead_idx ON public.lead_stage_history (lead_id, entered_at);

GRANT SELECT ON public.lead_stage_history TO authenticated;
GRANT ALL ON public.lead_stage_history TO service_role;

ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lead stage history"
  ON public.lead_stage_history FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 27/28/29) Histórico runtime (AFTER, nunca BEFORE)
CREATE OR REPLACE FUNCTION public.zzz_lead_stage_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  st_to public.pipeline_stages%ROWTYPE;
  st_from public.pipeline_stages%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.stage_id IS NOT NULL THEN
      SELECT * INTO st_to FROM public.pipeline_stages WHERE id = NEW.stage_id;
      INSERT INTO public.lead_stage_history
        (lead_id, user_id, from_stage_id, to_stage_id, from_stage_name, to_stage_name, from_stage_role, to_stage_role, entered_at, source)
      VALUES
        (NEW.id, NEW.user_id, NULL, NEW.stage_id, NULL, st_to.name, NULL, st_to.stage_role,
         COALESCE(NEW.data_contato::timestamptz, NEW.created_at, now()), 'runtime');
    END IF;
  ELSIF NEW.stage_id IS DISTINCT FROM OLD.stage_id AND NEW.stage_id IS NOT NULL THEN
    SELECT * INTO st_to FROM public.pipeline_stages WHERE id = NEW.stage_id;
    IF OLD.stage_id IS NOT NULL THEN
      SELECT * INTO st_from FROM public.pipeline_stages WHERE id = OLD.stage_id;
    END IF;
    INSERT INTO public.lead_stage_history
      (lead_id, user_id, from_stage_id, to_stage_id, from_stage_name, to_stage_name, from_stage_role, to_stage_role, entered_at, source)
    VALUES
      (NEW.id, NEW.user_id, OLD.stage_id, NEW.stage_id, st_from.name, st_to.name, st_from.stage_role, st_to.stage_role, now(), 'runtime');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zzz_lead_stage_history ON public.leads;
CREATE TRIGGER zzz_lead_stage_history
AFTER INSERT OR UPDATE OF stage_id ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.zzz_lead_stage_history();

-- 23/24/25/26) Backfill histórico (idempotente, só eventos com timestamp real)
INSERT INTO public.lead_stage_history
  (lead_id, user_id, from_stage_id, to_stage_id, from_stage_name, to_stage_name, from_stage_role, to_stage_role, entered_at, source)
WITH ev AS (
  SELECT l.id AS lead_id, l.user_id, ps.id AS stage_id, ps.name, ps.stage_role, ps.position,
    CASE ps.legacy_status
      WHEN 'Novo Lead' THEN (SELECT min(v) FROM (VALUES (l.data_contato::timestamptz), (l.data_entrada_novo_lead), (l.created_at)) AS s(v))
      WHEN 'Contato Iniciado' THEN l.data_entrada_contato_iniciado
      WHEN 'Triagem Feita' THEN l.data_entrada_triagem_feita
      WHEN 'Proposta Enviada' THEN l.data_entrada_proposta_enviada
      WHEN 'Follow-up' THEN l.data_entrada_follow_up
      WHEN 'Contrato Enviado' THEN l.data_entrada_contrato_enviado
      WHEN 'Fechado Ganho' THEN l.data_entrada_fechado_ganho
      WHEN 'Fechado Perdido' THEN l.data_entrada_fechado_perdido
    END AS ts
  FROM public.leads l
  JOIN public.pipeline_stages ps ON ps.user_id = l.user_id
),
events AS (SELECT * FROM ev WHERE ts IS NOT NULL),
chained AS (
  SELECT lead_id, user_id, stage_id, name, stage_role, ts,
    lag(stage_id) OVER w AS prev_stage_id,
    lag(name) OVER w AS prev_name,
    lag(stage_role) OVER w AS prev_role
  FROM events
  WINDOW w AS (PARTITION BY lead_id ORDER BY ts ASC, position ASC)
)
SELECT lead_id, user_id, prev_stage_id, stage_id, prev_name, name, prev_role, stage_role, ts, 'legacy_backfill'
FROM chained c
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_stage_history h
  WHERE h.lead_id = c.lead_id AND h.to_stage_id = c.stage_id AND h.entered_at = c.ts AND h.source = 'legacy_backfill'
);

COMMENT ON COLUMN public.leads.stage_id IS 'Espelho de leads.status via pipeline_stages.legacy_status (Sprint 01: status segue sendo a fonte oficial).';