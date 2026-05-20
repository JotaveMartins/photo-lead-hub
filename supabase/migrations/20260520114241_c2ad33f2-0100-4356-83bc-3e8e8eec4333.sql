ALTER TABLE public.whatsapp_instances ALTER COLUMN base_url DROP NOT NULL;
ALTER TABLE public.whatsapp_instances ALTER COLUMN api_key DROP NOT NULL;
ALTER TABLE public.whatsapp_instances ALTER COLUMN instance_key DROP NOT NULL;