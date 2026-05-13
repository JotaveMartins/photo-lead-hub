-- Set search path for function
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- Add policies for webhook_logs
CREATE POLICY "Users can view webhook logs" ON public.webhook_logs FOR SELECT USING (true);
CREATE POLICY "System can insert webhook logs" ON public.webhook_logs FOR INSERT WITH CHECK (true);

-- Ensure all tables have at least one policy if RLS is enabled
-- (The previous migration added some, but let's be thorough)

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_instances' AND policyname = 'Users can insert WhatsApp instances') THEN
        CREATE POLICY "Users can insert WhatsApp instances" ON public.whatsapp_instances FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_instances' AND policyname = 'Users can update WhatsApp instances') THEN
        CREATE POLICY "Users can update WhatsApp instances" ON public.whatsapp_instances FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can insert messages') THEN
        CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_config' AND policyname = 'Users can insert AI config') THEN
        CREATE POLICY "Users can insert AI config" ON public.ai_config FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_config' AND policyname = 'Users can update AI config') THEN
        CREATE POLICY "Users can update AI config" ON public.ai_config FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_files' AND policyname = 'Users can insert AI files') THEN
        CREATE POLICY "Users can insert AI files" ON public.ai_files FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_files' AND policyname = 'Users can delete AI files') THEN
        CREATE POLICY "Users can delete AI files" ON public.ai_files FOR DELETE USING (true);
    END IF;
END $$;
