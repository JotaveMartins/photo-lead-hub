-- Sprint 03: stage_id vira fonte operacional; personalização via RPCs seguras.

-- 1) Validação de nome: obrigatório, trim, 1-50 chars, único por conta (case-insensitive)
ALTER TABLE public.pipeline_stages
  ADD CONSTRAINT pipeline_stages_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 50);
CREATE UNIQUE INDEX IF NOT EXISTS pipeline_stages_unique_name_per_account
  ON public.pipeline_stages (user_id, lower(btrim(name)));

-- 2) Sincronização bidirecional status <-> stage_id
CREATE OR REPLACE FUNCTION public.zzz_lead_stage_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage public.pipeline_stages%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.stage_id IS NULL THEN
      -- escrita legada: resolve pela legacy_status; senão, etapa inicial (role lead)
      SELECT * INTO v_stage FROM public.pipeline_stages
        WHERE user_id = NEW.user_id AND legacy_status = NEW.status;
      IF NOT FOUND THEN
        SELECT * INTO v_stage FROM public.pipeline_stages
          WHERE user_id = NEW.user_id AND stage_role = 'lead';
      END IF;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta sem etapa inicial (role lead) configurada';
      END IF;
      NEW.stage_id := v_stage.id;
    ELSE
      -- stage_id informado: validar conta e refletir legacy_status no status
      SELECT * INTO v_stage FROM public.pipeline_stages WHERE id = NEW.stage_id;
      IF NOT FOUND OR v_stage.user_id <> NEW.user_id THEN
        RAISE EXCEPTION 'Etapa inválida para esta conta';
      END IF;
      IF v_stage.legacy_status IS NOT NULL THEN
        NEW.status := v_stage.legacy_status;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    -- stage_id vence
    SELECT * INTO v_stage FROM public.pipeline_stages WHERE id = NEW.stage_id;
    IF NOT FOUND OR v_stage.user_id <> NEW.user_id THEN
      RAISE EXCEPTION 'Etapa inválida para esta conta';
    END IF;
    IF v_stage.legacy_status IS NOT NULL THEN
      NEW.status := v_stage.legacy_status;
    END IF;
    -- etapa personalizada (legacy_status NULL): mantém status anterior como compatibilidade
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    -- escrita legada direta em status: sincroniza stage_id pela legacy_status da mesma conta
    SELECT * INTO v_stage FROM public.pipeline_stages
      WHERE user_id = NEW.user_id AND legacy_status = NEW.status;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Nenhuma etapa ativa desta conta corresponde ao status legado "%"', NEW.status;
    END IF;
    NEW.stage_id := v_stage.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) RPCs de personalização (SECURITY DEFINER; caller = dono da conta ou admin)

CREATE OR REPLACE FUNCTION public.create_pipeline_stage(_user_id uuid, _name text, _color_key text, _role text DEFAULT 'open')
RETURNS public.pipeline_stages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := btrim(_name);
  v_pos integer;
  v_row public.pipeline_stages%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão para alterar etapas desta conta';
  END IF;
  IF _role NOT IN ('open', 'proposal') THEN
    RAISE EXCEPTION 'Só é possível criar etapas comuns (open) ou de proposta (proposal)';
  END IF;
  IF v_name IS NULL OR char_length(v_name) < 1 OR char_length(v_name) > 50 THEN
    RAISE EXCEPTION 'Nome da etapa deve ter entre 1 e 50 caracteres';
  END IF;
  IF _color_key NOT IN ('stage-1','stage-2','stage-3','stage-4','stage-5','stage-6','status-success','status-danger') THEN
    RAISE EXCEPTION 'Cor inválida';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pipeline_stages WHERE user_id = _user_id AND lower(btrim(name)) = lower(v_name)) THEN
    RAISE EXCEPTION 'Já existe uma etapa com esse nome nesta conta';
  END IF;
  IF _role = 'proposal' AND EXISTS (SELECT 1 FROM public.pipeline_stages WHERE user_id = _user_id AND stage_role = 'proposal') THEN
    RAISE EXCEPTION 'Esta conta já possui uma etapa de proposta';
  END IF;
  -- nova etapa entra antes das terminais (won/lost)
  SELECT min(position) INTO v_pos FROM public.pipeline_stages
    WHERE user_id = _user_id AND stage_role IN ('won','lost');
  IF v_pos IS NULL THEN
    SELECT COALESCE(max(position), 0) + 1 INTO v_pos FROM public.pipeline_stages WHERE user_id = _user_id;
  ELSE
    UPDATE public.pipeline_stages SET position = position + 1
      WHERE user_id = _user_id AND position >= v_pos;
  END IF;
  INSERT INTO public.pipeline_stages (user_id, name, color_key, position, stage_role, legacy_status)
    VALUES (_user_id, v_name, _color_key, v_pos, _role, NULL)
    RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_pipeline_stage(_id uuid, _name text DEFAULT NULL, _color_key text DEFAULT NULL)
RETURNS public.pipeline_stages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage public.pipeline_stages%ROWTYPE;
  v_name text := btrim(_name);
BEGIN
  SELECT * INTO v_stage FROM public.pipeline_stages WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Etapa não encontrada'; END IF;
  IF auth.uid() IS NULL OR (auth.uid() <> v_stage.user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão para alterar etapas desta conta';
  END IF;
  IF _name IS NOT NULL THEN
    IF char_length(v_name) < 1 OR char_length(v_name) > 50 THEN
      RAISE EXCEPTION 'Nome da etapa deve ter entre 1 e 50 caracteres';
    END IF;
    IF EXISTS (SELECT 1 FROM public.pipeline_stages WHERE user_id = v_stage.user_id AND id <> _id AND lower(btrim(name)) = lower(v_name)) THEN
      RAISE EXCEPTION 'Já existe uma etapa com esse nome nesta conta';
    END IF;
    v_stage.name := v_name;
  END IF;
  IF _color_key IS NOT NULL THEN
    IF _color_key NOT IN ('stage-1','stage-2','stage-3','stage-4','stage-5','stage-6','status-success','status-danger') THEN
      RAISE EXCEPTION 'Cor inválida';
    END IF;
    v_stage.color_key := _color_key;
  END IF;
  UPDATE public.pipeline_stages SET name = v_stage.name, color_key = v_stage.color_key, updated_at = now()
    WHERE id = _id RETURNING * INTO v_stage;
  RETURN v_stage;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_pipeline_stages(_user_id uuid, _ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_first_role text;
  v_id uuid;
  i integer := 0;
  v_min_terminal integer;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão para alterar etapas desta conta';
  END IF;
  SELECT count(*) INTO v_count FROM public.pipeline_stages WHERE user_id = _user_id;
  IF v_count <> array_length(_ids, 1) OR EXISTS (
    SELECT 1 FROM unnest(_ids) AS u(id) WHERE NOT EXISTS (
      SELECT 1 FROM public.pipeline_stages ps WHERE ps.id = u.id AND ps.user_id = _user_id)) THEN
    RAISE EXCEPTION 'Lista de etapas inválida para esta conta';
  END IF;
  -- lead permanece primeiro
  SELECT stage_role INTO v_first_role FROM public.pipeline_stages WHERE id = _ids[1];
  IF v_first_role <> 'lead' THEN
    RAISE EXCEPTION 'A etapa inicial (lead) deve permanecer primeira';
  END IF;
  -- won/lost permanecem terminais: nenhuma open/proposal depois de won/lost
  SELECT min(ord) INTO v_min_terminal FROM (
    SELECT ordinality AS ord FROM unnest(_ids) WITH ORDINALITY AS u(id, ord)
      JOIN public.pipeline_stages ps ON ps.id = u.id
      WHERE ps.stage_role IN ('won','lost')
  ) t;
  IF EXISTS (
    SELECT 1 FROM unnest(_ids) WITH ORDINALITY AS u(id, ord)
      JOIN public.pipeline_stages ps ON ps.id = u.id
      WHERE ps.stage_role IN ('open','proposal','lead') AND u.ord > v_min_terminal) THEN
    RAISE EXCEPTION 'Etapas de ganho/perda devem permanecer no final';
  END IF;
  FOREACH v_id IN ARRAY _ids LOOP
    i := i + 1;
    UPDATE public.pipeline_stages SET position = i, updated_at = now() WHERE id = v_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_pipeline_stage(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage public.pipeline_stages%ROWTYPE;
  v_leads integer;
BEGIN
  SELECT * INTO v_stage FROM public.pipeline_stages WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Etapa não encontrada'; END IF;
  IF auth.uid() IS NULL OR (auth.uid() <> v_stage.user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão para alterar etapas desta conta';
  END IF;
  IF v_stage.stage_role IN ('lead','won','lost') THEN
    RAISE EXCEPTION 'As etapas inicial, de ganho e de perda não podem ser excluídas';
  END IF;
  SELECT count(*) INTO v_leads FROM public.leads WHERE stage_id = _id;
  IF v_leads > 0 THEN
    RAISE EXCEPTION 'Esta etapa possui % leads. Mova esses leads para outra etapa antes de excluí-la.', v_leads;
  END IF;
  DELETE FROM public.pipeline_stages WHERE id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pipeline_stage(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_pipeline_stage(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_pipeline_stages(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_pipeline_stage(uuid) TO authenticated;