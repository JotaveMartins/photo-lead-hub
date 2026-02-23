
-- Add soft delete column to leads
ALTER TABLE public.leads ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Update RLS policies to exclude soft-deleted leads from normal queries
-- Drop and recreate SELECT policies to filter out deleted leads
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads;
CREATE POLICY "Users can view their own leads" ON public.leads
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
CREATE POLICY "Admins can view all leads" ON public.leads
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NULL);

-- Separate policies for viewing deleted leads (for trash bin)
CREATE POLICY "Users can view their own deleted leads" ON public.leads
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

CREATE POLICY "Admins can view all deleted leads" ON public.leads
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND deleted_at IS NOT NULL);
