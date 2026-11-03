-- Access is independent of the mutable profile and of any payment gateway.
CREATE TABLE public.crm_account_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('trial', 'manual', 'legacy')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  valid_until timestamptz,
  plan text CHECK (plan IN ('semestral', 'anual')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((trial_started_at IS NULL) = (trial_ends_at IS NULL)),
  CHECK (trial_ends_at IS NULL OR trial_ends_at > trial_started_at),
  CHECK (mode <> 'manual' OR valid_until IS NOT NULL)
);
ALTER TABLE public.crm_account_access ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.crm_account_access TO authenticated;
GRANT ALL ON public.crm_account_access TO service_role;
CREATE POLICY "Read own CRM access or administer" ON public.crm_account_access
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
-- Existing accounts retain their current access. Their manual blocked flag still applies.
INSERT INTO public.crm_account_access(user_id, mode) SELECT id, 'legacy' FROM auth.users;

CREATE TABLE public.crm_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  previous_access jsonb,
  new_access jsonb NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_access_audit ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.crm_access_audit TO authenticated;
GRANT ALL ON public.crm_access_audit TO service_role;
CREATE POLICY "Admins read CRM access audit" ON public.crm_access_audit
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.initialize_crm_trial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.crm_account_access(user_id, mode, trial_started_at, trial_ends_at)
  VALUES (NEW.id, 'trial', NEW.email_confirmed_at,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at + interval '60 days' END)
  ON CONFLICT(user_id) DO UPDATE SET
    trial_started_at = excluded.trial_started_at, trial_ends_at = excluded.trial_ends_at, updated_at = now()
  WHERE crm_account_access.mode = 'trial' AND crm_account_access.trial_started_at IS NULL
    AND excluded.trial_started_at IS NOT NULL;
  RETURN NEW;
END $$;
CREATE TRIGGER initialize_crm_trial_on_auth
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.initialize_crm_trial();

-- Security-definer avoids recursion through protected tenant/profile policies.
CREATE OR REPLACE FUNCTION public.has_active_crm_access(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.role() = 'service_role' OR p_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) AND (
    coalesce(public.has_role(p_user_id, 'admin'), false) OR (
    p_user_id IS NOT NULL
    AND NOT coalesce((SELECT bloqueado FROM public.profiles WHERE user_id = p_user_id), false)
    AND EXISTS (SELECT 1 FROM public.crm_account_access a WHERE a.user_id = p_user_id AND (
      a.mode = 'legacy' OR (a.mode = 'trial' AND a.trial_ends_at > now())
      OR (a.mode = 'manual' AND a.valid_until > now())
    ))
  ));
$$;
REVOKE ALL ON FUNCTION public.has_active_crm_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_crm_access(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_crm_account_access(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.crm_account_access; expiry timestamptz; status text;
BEGIN
  IF auth.uid() IS NULL OR (p_user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO a FROM public.crm_account_access WHERE user_id = p_user_id;
  expiry := CASE WHEN a.mode = 'trial' THEN a.trial_ends_at ELSE a.valid_until END;
  status := CASE
    WHEN public.has_role(p_user_id, 'admin') THEN 'admin'
    WHEN coalesce((SELECT bloqueado FROM public.profiles WHERE user_id = p_user_id), false) THEN 'blocked'
    WHEN a.user_id IS NULL THEN 'unavailable'
    WHEN a.mode = 'legacy' THEN 'legacy'
    WHEN a.mode = 'trial' AND a.trial_started_at IS NULL THEN 'pending_confirmation'
    WHEN expiry IS NULL OR expiry <= now() THEN 'expired'
    ELSE a.mode END;
  RETURN jsonb_build_object('user_id', p_user_id, 'status', status,
    'allowed', status IN ('admin', 'legacy', 'trial', 'manual'), 'mode', a.mode, 'plan', a.plan,
    'trial_started_at', a.trial_started_at, 'expires_at', expiry, 'server_now', now(),
    'days_remaining', CASE WHEN expiry > now() THEN ceil(extract(epoch FROM expiry - now()) / 86400)::int ELSE 0 END);
END $$;
REVOKE ALL ON FUNCTION public.get_crm_account_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_crm_account_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_crm_access()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('nome', p.nome, 'email', p.email,
    'created_at', p.created_at, 'access', public.get_crm_account_access(p.user_id)) ORDER BY p.created_at DESC)
    FROM public.profiles p), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.admin_list_crm_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_crm_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_manage_crm_access(p_user_id uuid, p_action text, p_days integer DEFAULT NULL, p_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE previous public.crm_account_access; updated public.crm_account_access;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente administradores podem alterar o acesso' USING ERRCODE = '42501';
  END IF;
  IF length(coalesce(p_note, '')) > 500 THEN RAISE EXCEPTION 'Observação muito longa'; END IF;
  SELECT * INTO previous FROM public.crm_account_access WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;
  IF public.has_role(p_user_id, 'admin') THEN RAISE EXCEPTION 'Administradores não precisam de plano'; END IF;
  IF p_action = 'extend_trial' THEN
    IF previous.mode <> 'trial' OR previous.trial_started_at IS NULL THEN RAISE EXCEPTION 'A conta não possui teste iniciado'; END IF;
    IF p_days IS NULL OR p_days < 1 OR p_days > 60 THEN RAISE EXCEPTION 'Informe entre 1 e 60 dias'; END IF;
    UPDATE public.crm_account_access SET trial_ends_at = greatest(now(), trial_ends_at) + p_days * interval '1 day', updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_action IN ('grant_semestral', 'grant_anual') THEN
    UPDATE public.crm_account_access SET mode = 'manual',
      plan = CASE WHEN p_action = 'grant_semestral' THEN 'semestral' ELSE 'anual' END,
      valid_until = greatest(now(), CASE WHEN previous.mode = 'manual' THEN previous.valid_until END)
        + CASE WHEN p_action = 'grant_semestral' THEN interval '6 months' ELSE interval '1 year' END,
      updated_at = now() WHERE user_id = p_user_id;
  ELSE RAISE EXCEPTION 'Ação inválida'; END IF;
  SELECT * INTO updated FROM public.crm_account_access WHERE user_id = p_user_id;
  INSERT INTO public.crm_access_audit(user_id, actor_id, action, previous_access, new_access, note)
    VALUES(p_user_id, auth.uid(), p_action, to_jsonb(previous), to_jsonb(updated), coalesce(p_note, ''));
  RETURN public.get_crm_account_access(p_user_id);
END $$;
REVOKE ALL ON FUNCTION public.admin_manage_crm_access(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_crm_access(uuid, text, integer, text) TO authenticated;

-- A user's editable profile cannot be used to bypass administrative blocking or plan settings.
CREATE OR REPLACE FUNCTION public.protect_profile_access_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin') AND (
    NEW.bloqueado IS DISTINCT FROM OLD.bloqueado OR NEW.bloqueado_at IS DISTINCT FROM OLD.bloqueado_at
    OR NEW.plano_basico IS DISTINCT FROM OLD.plano_basico) THEN
    RAISE EXCEPTION 'Somente administradores podem alterar permissões da conta' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_profile_access_fields BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_access_fields();

-- Also guard writes performed through existing security-definer RPCs, while
-- allowing trusted service-role ingestion/webhooks to retain incoming records.
CREATE OR REPLACE FUNCTION public.guard_crm_authenticated_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.has_active_crm_access(auth.uid()) THEN
    RAISE EXCEPTION 'Período de acesso ao CRM encerrado' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

-- Add a restrictive gate to existing RLS-protected application tables. This does
-- not replace ownership policies. Authentication, profile, access and admin
-- configuration remain readable so an expired user can sign in and contact us.
DO $$ DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity
      AND c.relname NOT IN ('profiles', 'user_roles', 'app_settings', 'crm_account_access', 'crm_access_audit', 'user_access_log')
  LOOP
    EXECUTE format('CREATE TRIGGER crm_active_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_crm_authenticated_write()', t.relname);
    EXECUTE format('CREATE POLICY crm_active_access ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_active_crm_access(auth.uid())) WITH CHECK (public.has_active_crm_access(auth.uid()))', t.relname);
  END LOOP;
END $$;
CREATE POLICY crm_active_access ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
USING (public.has_active_crm_access(auth.uid())) WITH CHECK (public.has_active_crm_access(auth.uid()));