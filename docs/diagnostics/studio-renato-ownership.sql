-- Read-only evidence from existing publication relationships, not project names.
-- Confirm Renato's exact profile UUID before running (zero UUID returns nothing).
BEGIN READ ONLY;
SET LOCAL diagnostic.renato_user_id = '00000000-0000-0000-0000-000000000000';

SELECT user_id, nome FROM public.profiles
WHERE user_id = current_setting('diagnostic.renato_user_id')::uuid;

SELECT p.id AS project_id, p.nome AS project_name, p.user_id AS project_owner,
  source.nome AS project_owner_name, c.id AS carousel_id, c.user_id AS carousel_owner,
  post.id AS post_id, post.user_id AS post_owner, post.status AS post_status,
  post.published_at, post.instagram_media_id,
  social.id AS social_account_id, social.username AS instagram_username,
  social.user_id AS instagram_owner,
  (p.user_id = post.user_id AND c.user_id = post.user_id AND social.user_id = post.user_id) AS owners_match,
  (SELECT count(*) FROM public.photos ph WHERE ph.project_id = p.id) AS photo_count,
  (SELECT count(*) FROM public.photos ph WHERE ph.project_id = p.id AND ph.user_id <> post.user_id) AS photos_owned_by_another_account,
  (SELECT count(DISTINCT s2.user_id) FROM public.scheduled_posts s2
    JOIN public.carousels c2 ON c2.id = s2.carousel_id WHERE c2.project_id = p.id) AS distinct_post_owners,
  (SELECT count(DISTINCT a2.user_id) FROM public.scheduled_posts s2
    JOIN public.carousels c2 ON c2.id = s2.carousel_id
    JOIN public.social_accounts a2 ON a2.id = s2.social_account_id
    WHERE c2.project_id = p.id) AS distinct_instagram_owners
FROM public.scheduled_posts post
JOIN public.carousels c ON c.id = post.carousel_id
JOIN public.projects p ON p.id = c.project_id
LEFT JOIN public.profiles source ON source.user_id = p.user_id
LEFT JOIN public.social_accounts social ON social.id = post.social_account_id
WHERE post.user_id = current_setting('diagnostic.renato_user_id')::uuid
   OR social.user_id = current_setting('diagnostic.renato_user_id')::uuid
ORDER BY post.created_at DESC;

-- Drafts owned by Avanzo without a post/account relationship have no reliable
-- automatic target. They need explicit project identification before any transfer.
COMMIT;
