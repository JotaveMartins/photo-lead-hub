-- Sprint 01: Etapas personalizadas do Funil de Entregas

-- 1. Tabela de etapas
CREATE TABLE public.delivery_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color_key text NOT NULL,
  position integer NOT NULL,
  stage_role text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_stages_role_check CHECK (stage_role IN ('open','delivered')),
  CONSTRAINT delivery_stages_color_check CHECK (color_key IN ('delivery-1','delivery-2','delivery-3','delivery-4','delivery-5')),
  CONSTRAINT delivery_stages_name_len CHECK (char_length(trim(name)) BETWEEN 1 AND 50)
);

-- Apenas uma etapa delivered por conta
CREATE UNIQUE INDEX delivery_stages_one_delivered_per_user
  ON public.delivery_stages (user_id) WHERE stage_role = 'delivered';

-- Nome único por conta (case/trim insensitive)
CREATE UNIQUE INDEX delivery_stages_unique_name_per_user
  ON public.delivery_stages (user_id, lower(trim(name)));

CREATE INDEX delivery_stages_user_position_idx ON public.delivery_stages (user_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_stages TO authenticated;
GRANT ALL ON public.delivery_stages TO service_role;

ALTER TABLE public.delivery_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own delivery stages"
  ON public.delivery_stages FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 2. Função idempotente de etapas padrão
CREATE OR REPLACE FUNCTION public.ensure_default_delivery_stages(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.delivery_stages WHERE user_id = _user_id) THEN
    RETURN;
  END IF;
  INSERT INTO public.delivery_stages (user_id, name, color_key, position, stage_role) VALUES
    (_user_id, 'Ensaio Realizado', 'delivery-2', 0, 'open'),
    (_user_id, 'Em edição', 'delivery-3', 1, 'open'),
    (_user_id, 'Pronto para entrega', 'delivery-4', 2, 'open'),
    (_user_id, 'Entregue', 'delivery-5', 3, 'delivered')
  ON CONFLICT DO NOTHING;
END;
$$;

-- 3. Provisionamento para novas contas (após criação do profile)
CREATE OR REPLACE FUNCTION public.zzz_provision_delivery_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_default_delivery_stages(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER zzz_provision_delivery_stages_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.zzz_provision_delivery_stages();

-- 4. Contas existentes recebem as 4 etapas padrão
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles LOOP
    PERFORM public.ensure_default_delivery_stages(r.user_id);
  END LOOP;
END $$;

-- 5. stage_id em entregas
ALTER TABLE public.entregas ADD COLUMN stage_id uuid REFERENCES public.delivery_stages(id);
COMMENT ON COLUMN public.entregas.etapa IS 'DEPRECATED: legado. Fonte oficial é stage_id -> delivery_stages.';
COMMENT ON COLUMN public.entregas.stage_id IS 'Fonte oficial da etapa da entrega (delivery_stages).';

-- 6. Backfill: mapeia etapa legada -> etapa padrão da mesma conta
UPDATE public.entregas e
SET stage_id = s.id
FROM public.delivery_stages s
WHERE s.user_id = e.user_id
  AND lower(trim(s.name)) = lower(trim(e.etapa::text))
  AND e.stage_id IS NULL;

-- Fallback de segurança: qualquer entrega sem match vai para a primeira etapa open
UPDATE public.entregas e
SET stage_id = s.id
FROM public.delivery_stages s
WHERE e.stage_id IS NULL
  AND s.user_id = e.user_id
  AND s.stage_role = 'open'
  AND s.position = (SELECT min(position) FROM public.delivery_stages WHERE user_id = e.user_id AND stage_role = 'open');

-- 7. Histórico de etapas
CREATE TABLE public.delivery_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.entregas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  from_stage_id uuid REFERENCES public.delivery_stages(id) ON DELETE SET NULL,
  to_stage_id uuid NOT NULL REFERENCES public.delivery_stages(id) ON DELETE CASCADE,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX delivery_stage_history_delivery_idx ON public.delivery_stage_history (delivery_id, changed_at);

GRANT SELECT ON public.delivery_stage_history TO authenticated;
GRANT ALL ON public.delivery_stage_history TO service_role;

ALTER TABLE public.delivery_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own delivery stage history"
  ON public.delivery_stage_history FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 8. Trigger de entregas: fallback de etapa inicial, cross-account, data_entrega_final, histórico
CREATE OR REPLACE FUNCTION public.zzz_entrega_stage_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Integridade entre contas
    IF st.user_id <> NEW.user_id THEN
      RAISE EXCEPTION 'A etapa pertence a outra conta.';
    END IF;
    -- Regra delivered: preenche data_entrega_final quando vazia
    IF st.stage_role = 'delivered' AND NEW.data_entrega_final IS NULL THEN
      NEW.data_entrega_final := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
    END IF;
  END IF;

  -- Histórico: entrada inicial ou mudança real de etapa
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
$$;

CREATE TRIGGER zzz_entrega_stage_guard
  BEFORE INSERT OR UPDATE ON public.entregas
  FOR EACH ROW EXECUTE FUNCTION public.zzz_entrega_stage_guard();

-- 9. Proteções das etapas: delivered não pode ser excluída nem ter role alterado; última open não pode ser excluída
CREATE OR REPLACE FUNCTION public.zzz_delivery_stage_protect()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  open_count integer;
  ref_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.stage_role = 'delivered' THEN
      RAISE EXCEPTION 'A etapa final (conclusão) não pode ser excluída.';
    END IF;
    SELECT count(*) INTO open_count FROM public.delivery_stages
      WHERE user_id = OLD.user_id AND stage_role = 'open' AND id <> OLD.id;
    IF open_count = 0 THEN
      RAISE EXCEPTION 'O funil precisa ter pelo menos uma etapa antes da conclusão.';
    END IF;
    SELECT count(*) INTO ref_count FROM public.entregas WHERE stage_id = OLD.id;
    IF ref_count > 0 THEN
      RAISE EXCEPTION 'Esta etapa possui % entregas. Mova essas entregas para outra etapa antes de excluí-la.', ref_count;
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: não permitir alterar stage_role da etapa delivered
  IF OLD.stage_role = 'delivered' AND NEW.stage_role <> 'delivered' THEN
    RAISE EXCEPTION 'O papel da etapa final não pode ser alterado.';
  END IF;
  IF OLD.stage_role <> 'delivered' AND NEW.stage_role = 'delivered' THEN
    RAISE EXCEPTION 'Não é permitido transformar uma etapa comum em etapa final.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER zzz_delivery_stage_protect
  BEFORE UPDATE OR DELETE ON public.delivery_stages
  FOR EACH ROW EXECUTE FUNCTION public.zzz_delivery_stage_protect();