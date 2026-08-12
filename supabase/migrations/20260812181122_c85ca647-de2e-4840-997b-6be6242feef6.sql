CREATE POLICY "admins can view all projects" ON public.projects FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can view all photos" ON public.photos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can view all carousels" ON public.carousels FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can view all carousel slides" ON public.carousel_slides FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can view all slide photos" ON public.slide_photos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can read all project photo files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'project-photos' AND public.has_role(auth.uid(), 'admin'));