ALTER TABLE public.cobrancas
  ADD COLUMN IF NOT EXISTS service_id uuid NULL REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS package_id uuid NULL REFERENCES public.packages(id) ON DELETE SET NULL;
ALTER TABLE public.cobrancas
  ADD CONSTRAINT cobrancas_item_exclusivo CHECK (service_id IS NULL OR package_id IS NULL);
CREATE INDEX IF NOT EXISTS idx_cobrancas_service_id ON public.cobrancas(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cobrancas_package_id ON public.cobrancas(package_id) WHERE package_id IS NOT NULL;