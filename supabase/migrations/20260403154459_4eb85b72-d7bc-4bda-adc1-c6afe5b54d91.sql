ALTER TABLE public.events 
  ADD COLUMN cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;