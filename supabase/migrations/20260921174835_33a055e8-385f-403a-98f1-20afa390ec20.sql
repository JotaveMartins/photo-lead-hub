CREATE TYPE public.gallery_type AS ENUM ('delivery', 'selection');
CREATE TYPE public.gallery_status AS ENUM ('draft', 'published', 'expired', 'archived');
CREATE TYPE public.gallery_media_status AS ENUM ('pending', 'processing', 'ready', 'failed');

CREATE TABLE public.galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  gallery_type public.gallery_type NOT NULL DEFAULT 'delivery',
  status public.gallery_status NOT NULL DEFAULT 'draft',
  event_date date,
  expires_at timestamptz,
  password_hash text,
  cover_media_id uuid,
  cover_position_x numeric NOT NULL DEFAULT 50,
  cover_position_y numeric NOT NULL DEFAULT 50,
  download_enabled boolean NOT NULL DEFAULT true,
  download_quality text NOT NULL DEFAULT 'original',
  storage_bytes bigint NOT NULL DEFAULT 0,
  media_count integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE public.gallery_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.gallery_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.gallery_sections(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  filename text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  original_key text,
  thumbnail_key text,
  preview_key text,
  size_bytes bigint NOT NULL DEFAULT 0,
  width integer,
  height integer,
  sort_order integer NOT NULL DEFAULT 0,
  processing_status public.gallery_media_status NOT NULL DEFAULT 'pending',
  processing_error text,
  captured_at timestamptz,
  uploaded_at timestamptz,
  is_cover boolean NOT NULL DEFAULT false,
  is_disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_galleries_user ON public.galleries(user_id);
CREATE INDEX idx_gallery_sections_gallery ON public.gallery_sections(gallery_id);
CREATE INDEX idx_gallery_media_gallery ON public.gallery_media(gallery_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.galleries TO authenticated;
GRANT ALL ON public.galleries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_sections TO authenticated;
GRANT ALL ON public.gallery_sections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_media TO authenticated;
GRANT ALL ON public.gallery_media TO service_role;

ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own galleries" ON public.galleries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view galleries" ON public.galleries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users manage own gallery sections" ON public.gallery_sections FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view gallery sections" ON public.gallery_sections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users manage own gallery media" ON public.gallery_media FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view gallery media" ON public.gallery_media FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_galleries_updated_at BEFORE UPDATE ON public.galleries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gallery_media_updated_at BEFORE UPDATE ON public.gallery_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS storage_limit_bytes bigint NOT NULL DEFAULT 10737418240,
  ADD COLUMN IF NOT EXISTS storage_used_bytes bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.set_gallery_password(_gallery_id uuid, _password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.galleries g WHERE g.id = _gallery_id AND g.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Galeria não encontrada';
  END IF;
  UPDATE public.galleries
     SET password_hash = CASE WHEN _password IS NULL OR length(_password) = 0
                              THEN NULL
                              ELSE crypt(_password, gen_salt('bf')) END
   WHERE id = _gallery_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_gallery_password(_gallery_id uuid, _password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.galleries g
     WHERE g.id = _gallery_id
       AND g.password_hash IS NOT NULL
       AND g.password_hash = crypt(_password, g.password_hash)
  );
$$;