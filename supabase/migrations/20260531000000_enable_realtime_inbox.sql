-- Ensure inbox tables stream realtime changes so new messages appear instantly
ALTER TABLE public.inbox_messages REPLICA IDENTITY FULL;
ALTER TABLE public.inbox_conversations REPLICA IDENTITY FULL;

-- Add tables to the realtime publication (ignore if already present)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
