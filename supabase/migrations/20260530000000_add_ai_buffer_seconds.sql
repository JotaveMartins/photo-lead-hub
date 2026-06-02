-- Buffer: seconds the AI waits before replying, so it can batch rapid-fire
-- messages into a single response instead of replying to each one.
ALTER TABLE public.ai_config
  ADD COLUMN IF NOT EXISTS ai_buffer_seconds INTEGER NOT NULL DEFAULT 0;
