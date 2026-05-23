-- Tokens de integração por tenant (fotografo)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS asaas_api_key text,
ADD COLUMN IF NOT EXISTS autentique_token text;

-- Campos de sincronização com Asaas nas cobranças
ALTER TABLE public.cobrancas
ADD COLUMN IF NOT EXISTS asaas_id text,
ADD COLUMN IF NOT EXISTS asaas_invoice_url text,
ADD COLUMN IF NOT EXISTS asaas_billet_url text,
ADD COLUMN IF NOT EXISTS asaas_pix_code text;
