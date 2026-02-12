
-- Add due_time column for time-based task scheduling
ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS due_time TEXT DEFAULT NULL;
-- Add description column for custom tasks
ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
-- Add is_cadence flag to distinguish auto-generated from manual tasks
ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS is_cadence BOOLEAN NOT NULL DEFAULT true;
