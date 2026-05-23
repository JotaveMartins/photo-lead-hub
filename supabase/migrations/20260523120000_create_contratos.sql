-- Create contratos table
CREATE TABLE public.contratos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'aguardando_contrato',

  -- Client info
  nome_cliente text NOT NULL,
  cpf_cnpj text,
  email text,
  whatsapp text,
  endereco_cliente text,

  -- Event info
  data_evento date,
  horario_inicio text,
  horario_fim text,
  local_evento text,
  tipo_servico text,

  -- Contract details
  pacote text,
  valor numeric(10,2),
  forma_pagamento text,
  observacoes text,

  -- File / Autentique integration
  arquivo_contrato_url text,
  autentique_document_id text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT contratos_status_check CHECK (
    status IN ('aguardando_contrato', 'contrato_enviado', 'contrato_assinado')
  )
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contratos"
  ON public.contratos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contratos"
  ON public.contratos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contratos"
  ON public.contratos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contratos"
  ON public.contratos FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for contract files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contratos',
  'contratos',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload contracts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contratos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read contracts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contratos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete contracts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'contratos' AND auth.uid() IS NOT NULL);
