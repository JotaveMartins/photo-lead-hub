CREATE OR REPLACE FUNCTION public.zzz_protect_profile_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.bloqueado IS DISTINCT FROM OLD.bloqueado OR NEW.bloqueado_at IS DISTINCT FROM OLD.bloqueado_at)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.bloqueado := OLD.bloqueado;
    NEW.bloqueado_at := OLD.bloqueado_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzz_protect_profile_block ON public.profiles;
CREATE TRIGGER zzz_protect_profile_block
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.zzz_protect_profile_block();