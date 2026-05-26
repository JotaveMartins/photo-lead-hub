ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
UPDATE storage.buckets SET public = true WHERE id = 'contratos';
ALTER TABLE public.ai_config
  ADD COLUMN IF NOT EXISTS ai_trigger_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_trigger_keyword TEXT;