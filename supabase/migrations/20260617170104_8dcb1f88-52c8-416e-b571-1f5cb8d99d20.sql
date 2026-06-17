CREATE UNIQUE INDEX IF NOT EXISTS inbox_messages_whatsapp_message_id_unique
  ON public.inbox_messages (whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;