DROP POLICY IF EXISTS "Users can update AI config" ON public.ai_config;
DROP POLICY IF EXISTS "Users can view AI config" ON public.ai_config;
DROP POLICY IF EXISTS "Users can insert AI config" ON public.ai_config;
DROP POLICY IF EXISTS "Users can delete AI files" ON public.ai_files;
DROP POLICY IF EXISTS "Users can insert AI files" ON public.ai_files;
DROP POLICY IF EXISTS "Users can view AI files" ON public.ai_files;
DROP POLICY IF EXISTS "Users can update WhatsApp instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can view their own WhatsApp instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can insert WhatsApp instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages for their leads" ON public.messages;

DO $$
DECLARE table_name text; command text; commands text[]; predicate text; policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['ai_config', 'ai_files', 'whatsapp_instances'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    predicate := '(user_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))';
    EXECUTE format('DROP POLICY IF EXISTS tenant_owner_boundary ON public.%I', table_name);
    EXECUTE format('CREATE POLICY tenant_owner_boundary ON public.%I AS RESTRICTIVE FOR ALL TO PUBLIC USING (%s) WITH CHECK (%s)', table_name, predicate, predicate);
    commands := CASE WHEN table_name = 'ai_files' THEN ARRAY['SELECT', 'INSERT', 'DELETE'] ELSE ARRAY['SELECT', 'INSERT', 'UPDATE'] END;
    FOREACH command IN ARRAY commands LOOP
      policy_name := 'tenant_owned_' || lower(command);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
      IF command = 'INSERT' THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', policy_name, table_name, predicate);
      ELSIF command = 'UPDATE' THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', policy_name, table_name, predicate, predicate);
      ELSE
        EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO authenticated USING (%s)', policy_name, table_name, command, predicate);
      END IF;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS message_tenant_boundary ON public.messages;
CREATE POLICY message_tenant_boundary ON public.messages AS RESTRICTIVE FOR ALL TO PUBLIC
USING (
  public.has_role(auth.uid(), 'admin') OR
  (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = messages.lead_id AND l.user_id = auth.uid()
  ))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.leads l WHERE l.id = messages.lead_id AND l.user_id = auth.uid()
  ))
);
DROP POLICY IF EXISTS tenant_owned_select ON public.messages;
CREATE POLICY tenant_owned_select ON public.messages FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = messages.lead_id AND l.user_id = auth.uid()))
);
DROP POLICY IF EXISTS tenant_owned_insert ON public.messages;
CREATE POLICY tenant_owned_insert ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = messages.lead_id AND l.user_id = auth.uid()))
);

DROP POLICY IF EXISTS "inbox-media service update" ON storage.objects;
DROP POLICY IF EXISTS inbox_media_no_client_insert ON storage.objects;
CREATE POLICY inbox_media_no_client_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO PUBLIC
WITH CHECK (bucket_id <> 'inbox-media');
DROP POLICY IF EXISTS inbox_media_no_client_update ON storage.objects;
CREATE POLICY inbox_media_no_client_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO PUBLIC
USING (bucket_id <> 'inbox-media') WITH CHECK (bucket_id <> 'inbox-media');
DROP POLICY IF EXISTS inbox_media_no_client_delete ON storage.objects;
CREATE POLICY inbox_media_no_client_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO PUBLIC
USING (bucket_id <> 'inbox-media');