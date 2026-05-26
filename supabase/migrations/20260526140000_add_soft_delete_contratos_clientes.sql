-- Soft delete for contratos
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Link contratos to clientes
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;

-- Soft delete for clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Make contratos bucket public so authenticated users can view contract files
UPDATE storage.buckets SET public = true WHERE id = 'contratos';
