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
  IF v_stage.legacy_status IN ('Contato Iniciado','Follow-up') THEN
    RAISE EXCEPTION 'As etapas Contato Iniciado e Follow-up são protegidas e não podem ser excluídas';
  END IF;
  SELECT count(*) INTO v_leads FROM public.leads WHERE stage_id = _id;
  IF v_leads > 0 THEN
    RAISE EXCEPTION 'Esta etapa possui % leads. Mova esses leads para outra etapa antes de excluí-la.', v_leads;
  END IF;
  DELETE FROM public.pipeline_stages WHERE id = _id;
END;
$$;