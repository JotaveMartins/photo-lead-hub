REVOKE EXECUTE ON FUNCTION public.set_gallery_password(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_gallery_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_gallery_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_gallery_password(uuid, text) TO authenticated;