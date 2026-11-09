-- Read-only manifest for the four reviewed projects. Run with Cloud admin access.
WITH reviewed(project_id, carousel_id) AS (VALUES
 ('a7b92a42-ab25-4909-9878-abbfd8fdab30'::uuid, 'a24cdef8-6c00-4798-8ac7-11604255fa6d'::uuid),
 ('a5bde9c6-a4e8-43f8-94f8-bc3a23e73c70'::uuid, '770d3188-e28c-43a8-b2dc-98272ff53d6b'::uuid),
 ('eb00e80a-a478-48b3-9164-f7a3dea7d461'::uuid, 'd98bb711-dad7-4f6a-8024-b4505f4a5b98'::uuid),
 ('9e8c4052-4bbb-42d8-9d18-9d5763876f06'::uuid, '1c586473-a8ff-4f25-814b-5ad64519fd9f'::uuid)
)
SELECT p.id AS project_id, p.nome, p.user_id AS current_owner, post.user_id AS target_owner,
  source.nome AS current_owner_name, target.nome AS target_owner_name,
  ph.id AS photo_id, 'project-photos' AS bucket,
  ph.storage_path AS source_path,
  post.user_id::text || substring(ph.storage_path FROM length(p.user_id::text) + 1) AS destination_path,
  (obj.id IS NOT NULL) AS source_exists
FROM reviewed r
JOIN public.projects p ON p.id = r.project_id
JOIN public.carousels c ON c.id = r.carousel_id AND c.project_id = p.id
JOIN public.scheduled_posts post ON post.carousel_id = c.id
JOIN public.social_accounts a ON a.id = post.social_account_id AND a.user_id = post.user_id
JOIN public.profiles source ON source.user_id = p.user_id
JOIN public.profiles target ON target.user_id = post.user_id
JOIN public.photos ph ON ph.project_id = p.id
LEFT JOIN storage.objects obj ON obj.bucket_id = 'project-photos' AND obj.name = ph.storage_path
WHERE a.username = 'renatosoaresfoto' AND post.status = 'publicado'
ORDER BY p.id, ph.id;
