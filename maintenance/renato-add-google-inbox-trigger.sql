-- Run separately, once reviewed. Exact known account; abort if missing/ambiguous.
-- Keeps all existing rows and does not reactivate a disabled Google keyword.
BEGIN;
DO $$
DECLARE target_id uuid; matches integer;
BEGIN
  SELECT count(*) INTO matches FROM auth.users
  WHERE lower(email) = 'renatosoaresvenda@hotmail.com';
  IF matches <> 1 THEN RAISE EXCEPTION 'Expected exactly one Renato account, found %', matches; END IF;
  SELECT id INTO target_id FROM auth.users WHERE lower(email) = 'renatosoaresvenda@hotmail.com';
  -- Serialize concurrent runs for this account without touching any connection.
  PERFORM 1 FROM auth.users WHERE id = target_id FOR UPDATE;
  INSERT INTO public.inbox_triggers (user_id, keyword, active)
  SELECT target_id, 'vim pelo Google', true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.inbox_triggers
    WHERE user_id = target_id AND lower(keyword) LIKE '%vim pelo google%'
  );
END $$;
SELECT t.keyword, t.active FROM public.inbox_triggers t
JOIN auth.users u ON u.id = t.user_id
WHERE lower(u.email) = 'renatosoaresvenda@hotmail.com'
ORDER BY t.created_at, t.id;
COMMIT;
