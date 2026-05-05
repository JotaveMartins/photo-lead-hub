-- Restrict admin demo interests to Casamento, Civil, Debutante
DO $$
DECLARE
  admin_id uuid := 'c8efc0bc-3370-49fc-b9f3-2166f782fe65';
  opts text[] := ARRAY['Casamento','Civil','Debutante'];
BEGIN
  -- Ensure interesse_options has all three
  DELETE FROM public.interesse_options WHERE user_id = admin_id;
  INSERT INTO public.interesse_options (user_id, nome)
  SELECT admin_id, unnest(opts);

  -- Reassign all leads' interests randomly among those three
  UPDATE public.leads
  SET interesse = opts[1 + floor(random()*3)::int]
  WHERE user_id = admin_id;
END $$;