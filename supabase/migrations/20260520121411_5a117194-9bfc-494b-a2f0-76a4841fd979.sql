ALTER TABLE public.inbox_messages REPLICA IDENTITY FULL;
ALTER TABLE public.inbox_conversations REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;