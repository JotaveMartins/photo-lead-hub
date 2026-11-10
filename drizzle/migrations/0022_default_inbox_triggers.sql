-- Initialize only future accounts. Do not backfill or reset existing customizations.
CREATE OR REPLACE FUNCTION public.initialize_default_inbox_triggers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.inbox_triggers (user_id, keyword, active)
  SELECT NEW.id, defaults.keyword, true
  FROM (VALUES
    ('vim pelo anúncio'),
    ('informações sobre'),
    ('vim pelo Instagram'),
    ('vim pelo Google')
  ) AS defaults(keyword)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.inbox_triggers existing
    WHERE existing.user_id = NEW.id
      AND lower(btrim(existing.keyword)) = lower(defaults.keyword)
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.initialize_default_inbox_triggers() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER initialize_default_inbox_triggers_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.initialize_default_inbox_triggers();
