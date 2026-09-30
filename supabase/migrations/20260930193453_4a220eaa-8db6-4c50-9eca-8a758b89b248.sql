ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS selection_finalized_at timestamptz NULL;

-- Bloqueia seleção após finalização
CREATE OR REPLACE FUNCTION public.toggle_gallery_selection(_gallery_id uuid, _media_id uuid, _selected boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g record; _n integer;
BEGIN
  SELECT id, gallery_type, selection_limit, selection_finalized_at INTO g FROM public.galleries
   WHERE id = _gallery_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Galeria não encontrada'); END IF;
  IF g.selection_finalized_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'finalized', true, 'error', 'Esta seleção já foi finalizada.');
  END IF;

  IF NOT _selected THEN
    DELETE FROM public.gallery_selections WHERE gallery_id = _gallery_id AND media_id = _media_id;
    SELECT count(*) INTO _n FROM public.gallery_selections WHERE gallery_id = _gallery_id;
    RETURN jsonb_build_object('ok', true, 'selected', false, 'count', _n);
  END IF;

  IF g.gallery_type <> 'selection' OR g.selection_limit IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esta galeria não aceita seleção.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gallery_media WHERE id = _media_id AND gallery_id = _gallery_id AND is_disabled = false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Foto não encontrada');
  END IF;
  IF EXISTS (SELECT 1 FROM public.gallery_selections WHERE gallery_id = _gallery_id AND media_id = _media_id) THEN
    SELECT count(*) INTO _n FROM public.gallery_selections WHERE gallery_id = _gallery_id;
    RETURN jsonb_build_object('ok', true, 'selected', true, 'count', _n);
  END IF;
  SELECT count(*) INTO _n FROM public.gallery_selections WHERE gallery_id = _gallery_id;
  IF _n >= g.selection_limit THEN
    RETURN jsonb_build_object('ok', false, 'limit', true, 'count', _n,
      'error', format('Você já selecionou o limite de %s fotos.', g.selection_limit));
  END IF;
  INSERT INTO public.gallery_selections(gallery_id, media_id) VALUES (_gallery_id, _media_id);
  RETURN jsonb_build_object('ok', true, 'selected', true, 'count', _n + 1);
END $$;
REVOKE ALL ON FUNCTION public.toggle_gallery_selection(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_gallery_selection(uuid, uuid, boolean) TO service_role;

-- Finalização transacional (somente backend público)
CREATE OR REPLACE FUNCTION public.finalize_gallery_selection(_gallery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g record; _n integer; _at timestamptz;
BEGIN
  SELECT id, gallery_type, selection_limit, selection_finalized_at INTO g FROM public.galleries
   WHERE id = _gallery_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Galeria não encontrada'); END IF;
  SELECT count(*) INTO _n FROM public.gallery_selections WHERE gallery_id = _gallery_id;
  IF g.selection_finalized_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'count', _n, 'finalized_at', g.selection_finalized_at);
  END IF;
  IF g.gallery_type <> 'selection' OR g.selection_limit IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esta galeria não aceita seleção.');
  END IF;
  IF _n < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Selecione pelo menos uma fotografia antes de finalizar.');
  END IF;
  IF _n > g.selection_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', format('Você já selecionou o limite de %s fotos.', g.selection_limit));
  END IF;
  _at := now();
  UPDATE public.galleries SET selection_finalized_at = _at WHERE id = _gallery_id;
  RETURN jsonb_build_object('ok', true, 'count', _n, 'finalized_at', _at);
END $$;
REVOKE ALL ON FUNCTION public.finalize_gallery_selection(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_gallery_selection(uuid) TO service_role;

-- Reabertura: somente dono ou admin (autenticado)
CREATE OR REPLACE FUNCTION public.reopen_gallery_selection(_gallery_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.galleries WHERE id = _gallery_id AND deleted_at IS NULL
                 AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))) THEN
    RAISE EXCEPTION 'Galeria não encontrada' USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE public.galleries SET selection_finalized_at = NULL WHERE id = _gallery_id;
END $$;
REVOKE ALL ON FUNCTION public.reopen_gallery_selection(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_gallery_selection(uuid) TO authenticated, service_role;

-- Enquanto finalizada: tipo e limite não mudam; finalização só pelas funções acima
CREATE OR REPLACE FUNCTION public.zzz_protect_finalized_selection()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.selection_finalized_at IS NOT NULL AND NEW.selection_finalized_at IS NOT NULL
     AND (NEW.gallery_type IS DISTINCT FROM OLD.gallery_type OR NEW.selection_limit IS DISTINCT FROM OLD.selection_limit) THEN
    RAISE EXCEPTION 'Reabra a seleção para alterar o tipo ou o limite.' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.selection_finalized_at IS NULL AND NEW.selection_finalized_at IS NOT NULL
     AND current_setting('role', true) = 'authenticated' THEN
    RAISE EXCEPTION 'A seleção só pode ser finalizada pelo cliente.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.zzz_protect_finalized_selection() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER zzz_protect_finalized_selection
BEFORE UPDATE ON public.galleries
FOR EACH ROW EXECUTE FUNCTION public.zzz_protect_finalized_selection();

-- Foto de seleção finalizada não pode ser apagada
CREATE OR REPLACE FUNCTION public.zzz_protect_finalized_selection_media()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.gallery_selections s JOIN public.galleries g ON g.id = s.gallery_id
             WHERE s.media_id = OLD.id AND g.selection_finalized_at IS NOT NULL AND g.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Esta foto faz parte de uma seleção finalizada. Reabra a seleção antes de excluí-la.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.zzz_protect_finalized_selection_media() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER zzz_protect_finalized_selection_media
BEFORE DELETE ON public.gallery_media
FOR EACH ROW EXECUTE FUNCTION public.zzz_protect_finalized_selection_media();