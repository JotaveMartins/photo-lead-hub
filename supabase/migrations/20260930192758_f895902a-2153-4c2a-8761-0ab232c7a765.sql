ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS selection_limit integer NULL;
ALTER TABLE public.galleries ADD CONSTRAINT galleries_selection_limit_check CHECK (selection_limit IS NULL OR selection_limit >= 1);

CREATE TABLE public.gallery_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.gallery_media(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gallery_selections_unique UNIQUE (gallery_id, media_id)
);
CREATE INDEX idx_gallery_selections_media ON public.gallery_selections(media_id);

GRANT SELECT, INSERT, DELETE ON public.gallery_selections TO authenticated;
GRANT ALL ON public.gallery_selections TO service_role;
REVOKE ALL ON public.gallery_selections FROM anon;
ALTER TABLE public.gallery_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own gallery selections" ON public.gallery_selections
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.galleries g WHERE g.id = gallery_id AND g.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.galleries g WHERE g.id = gallery_id AND g.user_id = auth.uid()));

CREATE POLICY "Admins manage all gallery selections" ON public.gallery_selections
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Integridade: foto precisa pertencer à mesma galeria
CREATE OR REPLACE FUNCTION public.zzz_validate_gallery_selection()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.gallery_media m WHERE m.id = NEW.media_id AND m.gallery_id = NEW.gallery_id) THEN
    RAISE EXCEPTION 'A foto não pertence a esta galeria' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zzz_validate_gallery_selection
BEFORE INSERT OR UPDATE ON public.gallery_selections
FOR EACH ROW EXECUTE FUNCTION public.zzz_validate_gallery_selection();

-- Limite não pode ficar menor que a seleção atual
CREATE OR REPLACE FUNCTION public.zzz_validate_selection_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  IF NEW.selection_limit IS NOT NULL AND NEW.selection_limit IS DISTINCT FROM OLD.selection_limit THEN
    SELECT count(*) INTO _n FROM public.gallery_selections WHERE gallery_id = NEW.id;
    IF _n > NEW.selection_limit THEN
      RAISE EXCEPTION 'Existem % fotos selecionadas. O limite não pode ser menor que a seleção atual.', _n
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zzz_validate_selection_limit
BEFORE UPDATE OF selection_limit ON public.galleries
FOR EACH ROW EXECUTE FUNCTION public.zzz_validate_selection_limit();

-- RPC transacional (uso exclusivo do backend público via service_role)
CREATE OR REPLACE FUNCTION public.toggle_gallery_selection(_gallery_id uuid, _media_id uuid, _selected boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g record; _n integer;
BEGIN
  SELECT id, gallery_type, selection_limit INTO g FROM public.galleries
   WHERE id = _gallery_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Galeria não encontrada'); END IF;

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