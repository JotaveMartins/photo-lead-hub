
-- Admin INSERT/UPDATE/DELETE policies for leads
CREATE POLICY "Admins can update all leads"
ON public.leads FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert leads for any user"
ON public.leads FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all leads"
ON public.leads FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies for lead_tasks (already has SELECT)
CREATE POLICY "Admins can insert lead_tasks"
ON public.lead_tasks FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all lead_tasks"
ON public.lead_tasks FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all lead_tasks"
ON public.lead_tasks FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies for lead_notes
CREATE POLICY "Admins can view all lead_notes"
ON public.lead_notes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert lead_notes"
ON public.lead_notes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all lead_notes"
ON public.lead_notes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all lead_notes"
ON public.lead_notes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies for lead_history
CREATE POLICY "Admins can view all lead_history"
ON public.lead_history FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert lead_history"
ON public.lead_history FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies for events
CREATE POLICY "Admins can view all events"
ON public.events FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert events"
ON public.events FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all events"
ON public.events FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all events"
ON public.events FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies for interesse_options
CREATE POLICY "Admins can view all interesse_options"
ON public.interesse_options FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert interesse_options"
ON public.interesse_options FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all interesse_options"
ON public.interesse_options FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all interesse_options"
ON public.interesse_options FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies for messages
CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert messages"
ON public.messages FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
