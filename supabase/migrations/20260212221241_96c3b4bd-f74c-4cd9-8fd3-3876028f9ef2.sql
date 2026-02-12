
-- 1. Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT '',
  descricao TEXT,
  valor_base NUMERIC NOT NULL DEFAULT 0,
  custo_interno NUMERIC,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own services" ON public.services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own services" ON public.services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own services" ON public.services FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own services" ON public.services FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Evolve packages table
ALTER TABLE public.packages ADD COLUMN descricao TEXT;
ALTER TABLE public.packages ADD COLUMN categoria TEXT;
ALTER TABLE public.packages ADD COLUMN preco_final NUMERIC;

-- 3. Create package_services join table
CREATE TABLE public.package_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(package_id, service_id)
);

ALTER TABLE public.package_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own package_services" ON public.package_services FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.packages WHERE packages.id = package_services.package_id AND packages.user_id = auth.uid()));
CREATE POLICY "Users can create their own package_services" ON public.package_services FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.packages WHERE packages.id = package_services.package_id AND packages.user_id = auth.uid()));
CREATE POLICY "Users can delete their own package_services" ON public.package_services FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.packages WHERE packages.id = package_services.package_id AND packages.user_id = auth.uid()));

-- 4. Create lead_notes table
CREATE TABLE public.lead_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lead_notes" ON public.lead_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own lead_notes" ON public.lead_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own lead_notes" ON public.lead_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lead_notes" ON public.lead_notes FOR DELETE USING (auth.uid() = user_id);

-- 5. Update lead_status enum
ALTER TYPE public.lead_status RENAME VALUE 'Sem resposta' TO 'Novo Lead';
ALTER TYPE public.lead_status RENAME VALUE 'Interessado sem resposta' TO 'Contato Iniciado';
ALTER TYPE public.lead_status RENAME VALUE 'Sem interesse' TO 'Fechado Perdido';
ALTER TYPE public.lead_status RENAME VALUE 'Em andamento' TO 'Proposta Enviada';
ALTER TYPE public.lead_status RENAME VALUE 'Indisponibilidade Agenda' TO 'Follow-up';
ALTER TYPE public.lead_status RENAME VALUE 'Fechado' TO 'Fechado Ganho';

-- Add new enum values
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Contrato Enviado';

-- 6. Add new columns to leads
ALTER TABLE public.leads ADD COLUMN origem TEXT;
ALTER TABLE public.leads ADD COLUMN package_id UUID REFERENCES public.packages(id);
