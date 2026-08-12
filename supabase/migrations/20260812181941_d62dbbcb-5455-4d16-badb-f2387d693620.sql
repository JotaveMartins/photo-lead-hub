CREATE POLICY "admins can modify all projects" ON public.projects FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can delete all projects" ON public.projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can modify all photos" ON public.photos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can delete all photos" ON public.photos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can modify all carousels" ON public.carousels FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can delete all carousels" ON public.carousels FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can modify all carousel slides" ON public.carousel_slides FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can delete all carousel slides" ON public.carousel_slides FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can modify all slide photos" ON public.slide_photos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can delete all slide photos" ON public.slide_photos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can delete all project photo files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can update all project photo files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'project-photos' AND public.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'project-photos' AND public.has_role(auth.uid(), 'admin'));