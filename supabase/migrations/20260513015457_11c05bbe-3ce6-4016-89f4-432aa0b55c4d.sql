CREATE POLICY "Users can view own meta_daily_ads"
ON public.meta_daily_ads
FOR SELECT
TO authenticated
USING (client_id = auth.uid());