
-- Add senha column to profiles to store the generated password for admin reference
ALTER TABLE public.profiles ADD COLUMN senha text;
