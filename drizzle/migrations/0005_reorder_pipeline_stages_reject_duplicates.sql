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
  -- Cada etapa da conta deve aparecer exatamente uma vez: quantidade confere,
  -- sem IDs duplicados e todos pertencem à conta. Falha = rollback completo.
  IF v_count <> cardinality(_ids)
     OR (SELECT count(DISTINCT u.id) FROM unnest(_ids) AS u(id)) <> cardinality(_ids)
     OR EXISTS (
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

GRANT EXECUTE ON FUNCTION public.reorder_pipeline_stages(uuid, uuid[]) TO authenticated;