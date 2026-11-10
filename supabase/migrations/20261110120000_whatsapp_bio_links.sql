-- One editable public WhatsApp bio link per CRM account. No public table access.
CREATE TABLE public.whatsapp_bio_links (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  phone text NOT NULL CHECK (phone ~ '^[1-9][0-9]{7,14}$'),
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 2000)
);
ALTER TABLE public.whatsapp_bio_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_bio_links FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_bio_links TO authenticated;
CREATE POLICY whatsapp_bio_links_account ON public.whatsapp_bio_links
FOR ALL TO authenticated
USING ((user_id = auth.uid() AND public.has_active_crm_access(user_id)) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK ((user_id = auth.uid() AND public.has_active_crm_access(user_id)) OR public.has_role(auth.uid(), 'admin'));

-- Only resolves one exact slug. Never returns user IDs, credentials or a directory.
CREATE OR REPLACE FUNCTION public.resolve_whatsapp_bio_link(p_slug text)
RETURNS TABLE (phone text, message text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.phone, l.message FROM public.whatsapp_bio_links l
  WHERE l.slug = p_slug AND length(p_slug) BETWEEN 3 AND 50
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = l.user_id AND p.bloqueado IS TRUE)
    AND (public.has_role(l.user_id, 'admin') OR EXISTS (
      SELECT 1 FROM public.crm_account_access a WHERE a.user_id = l.user_id AND (
        a.mode = 'legacy' OR (a.mode = 'trial' AND a.trial_ends_at > now())
        OR (a.mode = 'manual' AND a.valid_until > now())
      )
    ));
$$;
REVOKE ALL ON FUNCTION public.resolve_whatsapp_bio_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_whatsapp_bio_link(text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
