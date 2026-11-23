DROP POLICY IF EXISTS "System can insert webhook logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "Users can view webhook logs" ON public.webhook_logs;

REVOKE ALL ON public.webhook_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.webhook_logs FROM authenticated;
GRANT SELECT ON public.webhook_logs TO authenticated;
GRANT ALL ON public.webhook_logs TO service_role;

CREATE POLICY "Admins can view webhook logs"
ON public.webhook_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));