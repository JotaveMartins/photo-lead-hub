
-- Create enum for despesa status
CREATE TYPE public.despesa_status AS ENUM ('paga', 'prevista');

-- Create despesas table
CREATE TABLE public.despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  data DATE NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outros',
  forma_pagamento public.payment_method NOT NULL DEFAULT 'pix',
  status public.despesa_status NOT NULL DEFAULT 'prevista',
  evento_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  observacoes TEXT,
  parcela_numero INTEGER,
  parcela_total INTEGER,
  grupo_id UUID,
  recorrente BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own despesas" ON public.despesas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own despesas" ON public.despesas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own despesas" ON public.despesas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own despesas" ON public.despesas FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all despesas" ON public.despesas FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert despesas" ON public.despesas FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all despesas" ON public.despesas FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete all despesas" ON public.despesas FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_despesas_updated_at BEFORE UPDATE ON public.despesas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
