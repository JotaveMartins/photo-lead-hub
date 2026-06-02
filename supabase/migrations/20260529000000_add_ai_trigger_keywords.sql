-- Add array of keywords/phrases that auto-start the AI for a conversation
ALTER TABLE public.ai_config
  ADD COLUMN IF NOT EXISTS ai_trigger_keywords TEXT[] DEFAULT '{}'::text[];

-- ai_trigger_enabled already exists; ensure it defaults to false
ALTER TABLE public.ai_config
  ALTER COLUMN ai_trigger_enabled SET DEFAULT false;
