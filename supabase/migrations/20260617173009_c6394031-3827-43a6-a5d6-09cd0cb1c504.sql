
-- A. Fix webhook_logs so insert from edge function stops failing silently
ALTER TABLE public.webhook_logs ADD COLUMN IF NOT EXISTS user_id uuid;

-- B. Dedupe historical outbound rows in inbox_messages: when two rows have the
-- same (conversation_id, direction='outbound', body) within 2 minutes and one
-- has whatsapp_message_id while the other is NULL, delete the NULL one.
DELETE FROM public.inbox_messages a
USING public.inbox_messages b
WHERE a.id <> b.id
  AND a.conversation_id = b.conversation_id
  AND a.direction = 'outbound'
  AND b.direction = 'outbound'
  AND a.whatsapp_message_id IS NULL
  AND b.whatsapp_message_id IS NOT NULL
  AND COALESCE(a.body, '') = COALESCE(b.body, '')
  AND ABS(EXTRACT(EPOCH FROM (a.timestamp - b.timestamp))) < 120;

-- C. Prevent future duplicates at the DB layer
CREATE UNIQUE INDEX IF NOT EXISTS inbox_messages_wid_unique
  ON public.inbox_messages (whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;
