
-- Add pre-proposal cadence date columns
ALTER TABLE public.leads ADD COLUMN cadencia_1 timestamp with time zone DEFAULT NULL;
ALTER TABLE public.leads ADD COLUMN cadencia_2 timestamp with time zone DEFAULT NULL;
ALTER TABLE public.leads ADD COLUMN cadencia_3 timestamp with time zone DEFAULT NULL;
ALTER TABLE public.leads ADD COLUMN cadencia_4 timestamp with time zone DEFAULT NULL;
ALTER TABLE public.leads ADD COLUMN cadencia_5 timestamp with time zone DEFAULT NULL;
