-- WhatsApp Instances table
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  instance_key TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected', -- connected | disconnected | connecting
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.whatsapp_instances(id),
  direction TEXT NOT NULL, -- inbound | outbound
  type TEXT NOT NULL, -- text | audio | image | video | document | sticker
  content TEXT, -- message text or caption
  media_url TEXT, -- public URL for media
  media_mime_type TEXT,
  media_filename TEXT,
  whatsapp_message_id TEXT, -- ID from Evolution API
  status TEXT DEFAULT 'sent', -- sent | delivered | read | failed
  sent_by TEXT DEFAULT 'ai', -- ai | human
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Webhook logs for debug
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_key TEXT,
  event TEXT,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Configuration table
CREATE TABLE IF NOT EXISTS public.ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- openai | anthropic | gemini | groq
  model TEXT NOT NULL, -- e.g., gpt-4o
  api_key TEXT NOT NULL,
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INT DEFAULT 1000,
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Files table
CREATE TABLE IF NOT EXISTS public.ai_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- pdf | image | document
  file_size_bytes BIGINT,
  send_condition TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS ai_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS triagem_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS budget TEXT,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS whatsapp_instance_id UUID REFERENCES public.whatsapp_instances(id);

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_files ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust as needed for specific user access)
CREATE POLICY "Users can view their own WhatsApp instances" ON public.whatsapp_instances FOR SELECT USING (true);
CREATE POLICY "Users can view messages for their leads" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Users can view AI config" ON public.ai_config FOR SELECT USING (true);
CREATE POLICY "Users can view AI files" ON public.ai_files FOR SELECT USING (true);

-- Update updated_at trigger for ai_config
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_config_updated_at
BEFORE UPDATE ON public.ai_config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
