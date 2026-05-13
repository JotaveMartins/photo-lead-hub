-- Add 'Triagem Feita' to lead_status enum
-- In PostgreSQL, you can't easily add a value to an enum within a transaction that also uses it, 
-- but Supabase migrations handle this.

ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Triagem Feita' BEFORE 'Proposta Enviada';
