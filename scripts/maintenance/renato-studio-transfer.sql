-- MANUAL MAINTENANCE, NOT A MIGRATION. Run only after the copy manifest is reviewed
-- and all 84 files have been copied with the Storage API (never SQL-copy objects).
-- Originals and published Instagram posts are preserved. Any failed check aborts.
BEGIN;
LOCK TABLE public.projects, public.photos, public.carousels, public.carousel_slides,
  public.slide_photos, public.scheduled_posts, public.social_accounts IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE storage.objects IN SHARE MODE;
CREATE TEMP TABLE reviewed_studio_transfer(project_id uuid PRIMARY KEY, carousel_id uuid UNIQUE, expected_photos integer) ON COMMIT DROP;
INSERT INTO reviewed_studio_transfer VALUES
 ('a7b92a42-ab25-4909-9878-abbfd8fdab30', 'a24cdef8-6c00-4798-8ac7-11604255fa6d', 26),
 ('a5bde9c6-a4e8-43f8-94f8-bc3a23e73c70', '770d3188-e28c-43a8-b2dc-98272ff53d6b', 30),
 ('eb00e80a-a478-48b3-9164-f7a3dea7d461', 'd98bb711-dad7-4f6a-8024-b4505f4a5b98', 11),
 ('9e8c4052-4bbb-42d8-9d18-9d5763876f06', '1c586473-a8ff-4f25-814b-5ad64519fd9f', 17);
DO $$
DECLARE source_id uuid; target_id uuid; n integer;
BEGIN
 SELECT min(p.user_id::text)::uuid, min(s.user_id::text)::uuid, count(*)
 INTO source_id, target_id, n
 FROM reviewed_studio_transfer r
 JOIN public.projects p ON p.id=r.project_id
 JOIN public.carousels c ON c.id=r.carousel_id AND c.project_id=p.id
 JOIN public.scheduled_posts s ON s.carousel_id=c.id
 JOIN public.social_accounts a ON a.id=s.social_account_id AND a.user_id=s.user_id
 JOIN public.profiles target ON target.user_id=s.user_id
 WHERE s.status='publicado' AND a.username='renatosoaresfoto';
 IF n <> 4 OR source_id IS NULL OR target_id IS NULL OR source_id=target_id THEN
   RAISE EXCEPTION 'Expected four published projects with distinct source/target. Stop and review; possibly already transferred.';
 END IF;
 IF EXISTS (
   SELECT 1 FROM reviewed_studio_transfer r JOIN public.projects p ON p.id=r.project_id
   JOIN public.carousels c ON c.id=r.carousel_id
   JOIN public.scheduled_posts s ON s.carousel_id=c.id
   WHERE p.user_id<>source_id OR c.user_id<>source_id OR s.user_id<>target_id
 ) THEN RAISE EXCEPTION 'Ambiguous source or target ownership'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=source_id)
    OR NOT public.has_role(source_id,'admin') THEN
   RAISE EXCEPTION 'Source is not an existing administrative account';
 END IF;
 IF EXISTS (
  SELECT 1 FROM reviewed_studio_transfer r
  WHERE (SELECT count(*) FROM public.carousels c WHERE c.project_id=r.project_id)<>1
     OR (SELECT count(*) FROM public.scheduled_posts s WHERE s.carousel_id=r.carousel_id)<>1
     OR (SELECT count(*) FROM public.photos p WHERE p.project_id=r.project_id)<>r.expected_photos
 ) THEN RAISE EXCEPTION 'Carousel/post/photo counts changed; stop and review'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.photos p JOIN reviewed_studio_transfer r ON r.project_id=p.project_id
  WHERE p.user_id<>source_id OR p.storage_path IS NULL
     OR p.storage_path NOT LIKE source_id::text || '/' || p.project_id::text || '/%'
 ) OR EXISTS (
  SELECT 1 FROM public.carousel_slides s JOIN reviewed_studio_transfer r ON r.carousel_id=s.carousel_id
  WHERE s.user_id<>source_id
 ) OR EXISTS (
  SELECT 1 FROM public.slide_photos sp
  JOIN public.carousel_slides s ON s.id=sp.slide_id
  JOIN reviewed_studio_transfer r ON r.carousel_id=s.carousel_id
  JOIN public.photos p ON p.id=sp.photo_id
  WHERE sp.user_id<>source_id OR p.project_id<>r.project_id
 ) OR EXISTS (
  SELECT 1 FROM public.slide_photos sp JOIN public.photos p ON p.id=sp.photo_id
  JOIN reviewed_studio_transfer r ON r.project_id=p.project_id
  JOIN public.carousel_slides s ON s.id=sp.slide_id
  WHERE s.carousel_id<>r.carousel_id
 ) THEN RAISE EXCEPTION 'Unexpected ownership/path or external photo reference'; END IF;
 -- The final rendered images were already saved in Renato's folder: verify and
 -- preserve their paths and metadata rather than rendering or publishing again.
 IF EXISTS (
  SELECT 1 FROM public.carousels c JOIN reviewed_studio_transfer r ON r.carousel_id=c.id
  WHERE c.rendered_slides IS NULL OR jsonb_typeof(c.rendered_slides)<>'array' OR c.rendered_slides='[]'::jsonb
 ) THEN RAISE EXCEPTION 'Published carousel is missing rendered images'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.carousels c JOIN reviewed_studio_transfer r ON r.carousel_id=c.id
  CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(c.rendered_slides,'[]'::jsonb)) f(path)
  WHERE f.path NOT LIKE target_id::text || '/' || c.id::text || '/%'
     OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='carousel-renders' AND o.name=f.path)
 ) THEN RAISE EXCEPTION 'Final rendered images differ from the reviewed destination'; END IF;
 -- Require real copied Storage objects and matching positive byte lengths.
 IF EXISTS (
  SELECT 1 FROM public.photos p JOIN reviewed_studio_transfer r ON r.project_id=p.project_id
  LEFT JOIN storage.objects old ON old.bucket_id='project-photos' AND old.name=p.storage_path
  LEFT JOIN storage.objects new ON new.bucket_id='project-photos'
    AND new.name=target_id::text || substring(p.storage_path FROM length(source_id::text)+1)
  WHERE old.id IS NULL OR new.id IS NULL
     OR coalesce(old.metadata->>'size','') !~ '^[1-9][0-9]*$'
     OR old.metadata->>'size' IS DISTINCT FROM new.metadata->>'size'
 ) THEN RAISE EXCEPTION 'Original/copied photos missing or byte lengths differ. Finish and validate copies first.'; END IF;

 UPDATE public.projects p SET user_id=target_id
 FROM reviewed_studio_transfer r WHERE p.id=r.project_id;
 UPDATE public.photos p SET user_id=target_id,
   storage_path=target_id::text || substring(p.storage_path FROM length(source_id::text)+1),
   image_url=target_id::text || substring(p.storage_path FROM length(source_id::text)+1)
 FROM reviewed_studio_transfer r WHERE p.project_id=r.project_id;
 UPDATE public.carousels c SET user_id=target_id
 FROM reviewed_studio_transfer r WHERE c.id=r.carousel_id;
 UPDATE public.carousel_slides s SET user_id=target_id
 FROM reviewed_studio_transfer r WHERE s.carousel_id=r.carousel_id;
 UPDATE public.slide_photos sp SET user_id=target_id
 FROM public.carousel_slides s, reviewed_studio_transfer r
 WHERE sp.slide_id=s.id AND s.carousel_id=r.carousel_id;
 RAISE NOTICE 'Transferred four projects and 84 photo records. Original files and posts preserved.';
END $$;
COMMIT;
