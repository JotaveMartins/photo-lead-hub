ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS entrega_id uuid REFERENCES public.entregas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_galleries_entrega ON public.galleries(entrega_id);