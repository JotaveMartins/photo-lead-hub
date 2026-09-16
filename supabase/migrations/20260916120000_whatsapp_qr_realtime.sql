-- Persist the latest QR code per instance and stream it over Realtime so the
-- connect UI can always show a fresh code — Baileys/WhatsApp QR codes rotate
-- every ~20-60s, and without this the frontend was stuck showing a single
-- static (and quickly expiring) QR image.
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_updated_at TIMESTAMPTZ;

ALTER TABLE public.whatsapp_instances REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instances;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
