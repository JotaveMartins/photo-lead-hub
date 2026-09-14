CREATE TABLE public.lead_admin_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  color text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (lead_id, admin_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_admin_tags TO authenticated;
GRANT ALL ON public.lead_admin_tags TO service_role;

ALTER TABLE public.lead_admin_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own lead tags"
ON public.lead_admin_tags FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

CREATE INDEX idx_lead_admin_tags_lead ON public.lead_admin_tags(lead_id);

CREATE TRIGGER update_lead_admin_tags_updated_at
BEFORE UPDATE ON public.lead_admin_tags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();