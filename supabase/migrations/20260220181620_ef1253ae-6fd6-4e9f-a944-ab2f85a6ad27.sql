
-- Allow admins to SELECT all leads
CREATE POLICY "Admins can view all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to SELECT all lead_tasks
CREATE POLICY "Admins can view all lead_tasks"
ON public.lead_tasks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
