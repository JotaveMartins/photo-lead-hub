UPDATE public.profiles p
SET ultimo_acesso = u.last_sign_in_at
FROM auth.users u
WHERE p.user_id = u.id
  AND u.last_sign_in_at IS NOT NULL;