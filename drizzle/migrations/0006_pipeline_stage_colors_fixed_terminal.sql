CREATE OR REPLACE FUNCTION public.create_pipeline_stage(_user_id uuid, _name text, _color_key text, _role text DEFAULT 'open'::text)
 RETURNS pipeline_stages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF _color_key NOT IN ('stage-1','stage-2','stage-3','stage-4','stage-5','stage-6','stage-7','stage-8','stage-9','stage-10','stage-11','stage-12') THEN
    RAISE EXCEPTION 'Cor inválida';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pipeline_stages WHERE user_id = _user_id AND lower(btrim(name)) = lower(v_name)) THEN
    RAISE EXCEPTION 'Já existe uma etapa com esse nome nesta conta';
  END IF;
  IF _role = 'proposal' AND EXISTS (SELECT 1 FROM public.pipeline_stages WHERE user_id = _user_id AND stage_role = 'proposal') THEN
    RAISE EXCEPTION 'Esta conta já possui uma etapa de proposta';
  END IF;
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
$function$;

CREATE OR REPLACE FUNCTION public.update_pipeline_stage(_id uuid, _name text DEFAULT NULL::text, _color_key text DEFAULT NULL::text)
 RETURNS pipeline_stages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    IF v_stage.stage_role IN ('won','lost') THEN
      RAISE EXCEPTION 'A cor das etapas de ganho e perda é fixa';
    END IF;
    IF _color_key NOT IN ('stage-1','stage-2','stage-3','stage-4','stage-5','stage-6','stage-7','stage-8','stage-9','stage-10','stage-11','stage-12') THEN
      RAISE EXCEPTION 'Cor inválida';
    END IF;
    v_stage.color_key := _color_key;
  END IF;
  UPDATE public.pipeline_stages SET name = v_stage.name, color_key = v_stage.color_key, updated_at = now()
    WHERE id = _id RETURNING * INTO v_stage;
  RETURN v_stage;
END;
$function$;

-- Cores fixas: ganho = verde, perda = vermelho (backfill das etapas existentes)
UPDATE public.pipeline_stages SET color_key = 'status-success', updated_at = now() WHERE stage_role = 'won' AND color_key <> 'status-success';
UPDATE public.pipeline_stages SET color_key = 'status-danger', updated_at = now() WHERE stage_role = 'lost' AND color_key <> 'status-danger';