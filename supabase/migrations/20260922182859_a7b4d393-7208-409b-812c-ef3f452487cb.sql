CREATE TABLE public.gallery_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.gallery_media(id) ON DELETE CASCADE,
  visitor_session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gallery_id, media_id, visitor_session_id)
);

GRANT SELECT ON public.gallery_favorites TO authenticated;
GRANT ALL ON public.gallery_favorites TO service_role;

ALTER TABLE public.gallery_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view favorites of own galleries"
ON public.gallery_favorites FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.galleries g WHERE g.id = gallery_favorites.gallery_id AND g.user_id = auth.uid()));

CREATE INDEX idx_gallery_favorites_gallery ON public.gallery_favorites(gallery_id);
CREATE INDEX idx_gallery_favorites_session ON public.gallery_favorites(gallery_id, visitor_session_id);