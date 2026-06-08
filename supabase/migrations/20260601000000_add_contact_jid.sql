-- Store the exact WhatsApp JID (may be @lid on newer WhatsApp) so we reply to the
-- correct identity instead of rebuilding <number>@s.whatsapp.net (which fails for LIDs).
ALTER TABLE public.inbox_conversations
  ADD COLUMN IF NOT EXISTS contact_jid TEXT;

NOTIFY pgrst, 'reload schema';
