-- Garante que todas as colunas usadas pela tela de IA existam em ai_config.
-- Migrations anteriores que adicionavam essas colunas não chegaram a ser
-- aplicadas no banco gerenciado, então o upsert da configuração falhava com
-- "Could not find the 'knowledge_base' column of 'ai_config' in the schema cache".
-- Idempotente (IF NOT EXISTS) — seguro rodar mais de uma vez.

ALTER TABLE public.ai_config ADD COLUMN IF NOT EXISTS knowledge_base TEXT;
ALTER TABLE public.ai_config ADD COLUMN IF NOT EXISTS ai_trigger_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.ai_config ADD COLUMN IF NOT EXISTS ai_trigger_keyword TEXT;
ALTER TABLE public.ai_config ADD COLUMN IF NOT EXISTS ai_trigger_keywords TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.ai_config ADD COLUMN IF NOT EXISTS ai_buffer_seconds INTEGER NOT NULL DEFAULT 0;

-- Recarrega o cache de schema do PostgREST para reconhecer as novas colunas.
NOTIFY pgrst, 'reload schema';
