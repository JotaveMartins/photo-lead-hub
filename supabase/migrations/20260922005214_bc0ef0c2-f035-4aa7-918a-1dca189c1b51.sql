CREATE OR REPLACE FUNCTION public.get_public_gallery(_slug text)
RETURNS TABLE(name text, event_date date, media_count integer, download_enabled boolean, has_password boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.name, g.event_date, g.media_count, g.download_enabled, (g.password_hash IS NOT NULL)
  FROM public.galleries g
  WHERE g.slug = _slug
    AND g.status = 'published'
    AND g.deleted_at IS NULL
    AND (g.expires_at IS NULL OR g.expires_at > now())
$$;

REVOKE ALL ON FUNCTION public.get_public_gallery(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_gallery(text) TO anon, authenticated;