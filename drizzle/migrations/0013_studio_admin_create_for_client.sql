-- Admins already manage client Studio data, but INSERT permissions were missing.
-- Allow creation for an existing client with consistent parent ownership.
DROP POLICY IF EXISTS studio_admin_insert ON public.projects;
CREATE POLICY studio_admin_insert ON public.projects FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = projects.user_id
));
DROP POLICY IF EXISTS studio_admin_insert ON public.photos;
CREATE POLICY studio_admin_insert ON public.photos FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = photos.project_id AND p.user_id = photos.user_id
));
DROP POLICY IF EXISTS studio_admin_insert ON public.carousels;
CREATE POLICY studio_admin_insert ON public.carousels FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = carousels.project_id AND p.user_id = carousels.user_id
));
DROP POLICY IF EXISTS studio_admin_insert ON public.carousel_slides;
CREATE POLICY studio_admin_insert ON public.carousel_slides FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (
  SELECT 1 FROM public.carousels c WHERE c.id = carousel_slides.carousel_id AND c.user_id = carousel_slides.user_id
));
DROP POLICY IF EXISTS studio_admin_insert ON public.slide_photos;
CREATE POLICY studio_admin_insert ON public.slide_photos FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (
  SELECT 1 FROM public.carousel_slides s JOIN public.photos p ON p.id = slide_photos.photo_id
  WHERE s.id = slide_photos.slide_id AND s.user_id = slide_photos.user_id AND p.user_id = slide_photos.user_id
));
DROP POLICY IF EXISTS studio_admin_upload_project_photo ON storage.objects;
CREATE POLICY studio_admin_upload_project_photo ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-photos' AND public.has_role(auth.uid(), 'admin') AND EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.user_id::text = (storage.foldername(name))[1] AND p.id::text = (storage.foldername(name))[2]
));
-- No ownership updates, data transfers, publication or file moves are performed.
