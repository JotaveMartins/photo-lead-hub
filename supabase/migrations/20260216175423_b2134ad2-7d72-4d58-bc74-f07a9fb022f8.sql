
-- Table to store lead field change history
CREATE TABLE public.lead_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lead_history"
  ON public.lead_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead_history"
  ON public.lead_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead_history"
  ON public.lead_history FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_lead_history_lead_id ON public.lead_history(lead_id);
CREATE INDEX idx_lead_history_created_at ON public.lead_history(created_at);
