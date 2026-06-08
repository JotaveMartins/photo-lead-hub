-- Store the contact's LID (the alternate WhatsApp identity) so we can match the
-- same person whether a message arrives keyed by phone number or by @lid,
-- preventing duplicate conversations.
ALTER TABLE public.inbox_conversations
  ADD COLUMN IF NOT EXISTS contact_lid TEXT;

NOTIFY pgrst, 'reload schema';
