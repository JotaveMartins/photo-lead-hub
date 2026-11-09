-- Restrictive checks intersect with all permissive policies, including old own-row rules.
-- Normal users must own both the row and its linked records. Admin support/repair
-- and service-role jobs keep their existing permissions; no rows are rewritten.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS studio_relationship_boundary ON public.projects;
CREATE POLICY studio_relationship_boundary ON public.projects AS RESTRICTIVE FOR ALL TO PUBLIC
USING (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid()));

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS studio_relationship_boundary ON public.photos;
CREATE POLICY studio_relationship_boundary ON public.photos AS RESTRICTIVE FOR ALL TO PUBLIC
USING (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = photos.project_id AND p.user_id = photos.user_id)))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = photos.project_id AND p.user_id = photos.user_id)));

ALTER TABLE public.carousels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS studio_relationship_boundary ON public.carousels;
CREATE POLICY studio_relationship_boundary ON public.carousels AS RESTRICTIVE FOR ALL TO PUBLIC
USING (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = carousels.project_id AND p.user_id = carousels.user_id)))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = carousels.project_id AND p.user_id = carousels.user_id)));

ALTER TABLE public.carousel_slides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS studio_relationship_boundary ON public.carousel_slides;
CREATE POLICY studio_relationship_boundary ON public.carousel_slides AS RESTRICTIVE FOR ALL TO PUBLIC
USING (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.carousels c WHERE c.id = carousel_slides.carousel_id AND c.user_id = carousel_slides.user_id)))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.carousels c WHERE c.id = carousel_slides.carousel_id AND c.user_id = carousel_slides.user_id)));

ALTER TABLE public.slide_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS studio_relationship_boundary ON public.slide_photos;
CREATE POLICY studio_relationship_boundary ON public.slide_photos AS RESTRICTIVE FOR ALL TO PUBLIC
USING (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND EXISTS (
 SELECT 1 FROM public.carousel_slides s
 JOIN public.carousels c ON c.id = s.carousel_id
 JOIN public.photos p ON p.id = slide_photos.photo_id
 WHERE s.id = slide_photos.slide_id AND s.user_id = slide_photos.user_id
   AND c.user_id = slide_photos.user_id AND p.user_id = slide_photos.user_id
   AND p.project_id = c.project_id
)))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND EXISTS (
 SELECT 1 FROM public.carousel_slides s
 JOIN public.carousels c ON c.id = s.carousel_id
 JOIN public.photos p ON p.id = slide_photos.photo_id
 WHERE s.id = slide_photos.slide_id AND s.user_id = slide_photos.user_id
   AND c.user_id = slide_photos.user_id AND p.user_id = slide_photos.user_id
   AND p.project_id = c.project_id
)));

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS studio_relationship_boundary ON public.scheduled_posts;
CREATE POLICY studio_relationship_boundary ON public.scheduled_posts AS RESTRICTIVE FOR ALL TO PUBLIC
USING (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND EXISTS (
 SELECT 1 FROM public.carousels c WHERE c.id = scheduled_posts.carousel_id AND c.user_id = scheduled_posts.user_id
) AND (social_account_id IS NULL OR EXISTS (
 SELECT 1 FROM public.social_accounts a WHERE a.id = scheduled_posts.social_account_id AND a.user_id = scheduled_posts.user_id
))))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR (user_id = auth.uid() AND EXISTS (
 SELECT 1 FROM public.carousels c WHERE c.id = scheduled_posts.carousel_id AND c.user_id = scheduled_posts.user_id
) AND (social_account_id IS NULL OR EXISTS (
 SELECT 1 FROM public.social_accounts a WHERE a.id = scheduled_posts.social_account_id AND a.user_id = scheduled_posts.user_id
))));

-- A removed Instagram connection sets social_account_id to NULL: keep the
-- owner able to read its history. Publishing still requires a live connection.
