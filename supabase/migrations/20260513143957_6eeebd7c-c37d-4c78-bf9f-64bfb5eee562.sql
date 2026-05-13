-- Add user_id to ai_config
ALTER TABLE public.ai_config ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Add user_id to ai_files
ALTER TABLE public.ai_files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Add user_id to whatsapp_instances
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Enable RLS
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Policies for ai_config
CREATE POLICY "Users can manage their own ai_config"
ON public.ai_config
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for ai_files
CREATE POLICY "Users can manage their own ai_files"
ON public.ai_files
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for whatsapp_instances
CREATE POLICY "Users can manage their own whatsapp_instances"
ON public.whatsapp_instances
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
