ALTER TABLE public.inbox_conversations
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN;
