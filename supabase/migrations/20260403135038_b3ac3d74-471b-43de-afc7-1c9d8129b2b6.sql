
-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('pix', 'cartao', 'boleto', 'transferencia', 'dinheiro');

-- Create charge status enum
CREATE TYPE public.cobranca_status AS ENUM ('aguardando', 'paga', 'vencida');

-- Create charge type enum
CREATE TYPE public.cobranca_tipo AS ENUM ('unica', 'parcela', 'recorrente');

-- Create cobrancas table
CREATE TABLE public.cobrancas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  grupo_id UUID,
  tipo public.cobranca_tipo NOT NULL DEFAULT 'unica',
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento public.payment_method NOT NULL DEFAULT 'pix',
  status public.cobranca_status NOT NULL DEFAULT 'aguardando',
  vencimento DATE NOT NULL,
  data_pagamento DATE,
  parcela_numero INTEGER,
  parcela_total INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own cobrancas" ON public.cobrancas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cobrancas" ON public.cobrancas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cobrancas" ON public.cobrancas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cobrancas" ON public.cobrancas FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all cobrancas" ON public.cobrancas FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert cobrancas" ON public.cobrancas FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all cobrancas" ON public.cobrancas FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete all cobrancas" ON public.cobrancas FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_cobrancas_updated_at BEFORE UPDATE ON public.cobrancas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
