ALTER TABLE public.inbox_conversations
  ADD COLUMN IF NOT EXISTS instance_id uuid;

CREATE INDEX IF NOT EXISTS idx_inbox_conversations_instance_id
  ON public.inbox_conversations(instance_id);