ALTER TABLE public.events ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.services ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.packages ADD COLUMN deleted_at timestamptz DEFAULT NULL;