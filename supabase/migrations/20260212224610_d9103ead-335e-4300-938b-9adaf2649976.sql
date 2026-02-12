
-- Create lead_tasks table for cadence system
CREATE TABLE public.lead_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  task_number INT NOT NULL DEFAULT 1,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lead_tasks"
  ON public.lead_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead_tasks"
  ON public.lead_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead_tasks"
  ON public.lead_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead_tasks"
  ON public.lead_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient querying
CREATE INDEX idx_lead_tasks_lead_id ON public.lead_tasks(lead_id);
CREATE INDEX idx_lead_tasks_due_date ON public.lead_tasks(due_date);

-- Function to auto-create first task when lead enters "Contato Iniciado"
CREATE OR REPLACE FUNCTION public.create_cadence_task_on_contato()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Contato Iniciado' THEN
    -- Delete any existing cadence tasks for this lead
    DELETE FROM public.lead_tasks WHERE lead_id = NEW.id;
    -- Create first contact task
    INSERT INTO public.lead_tasks (lead_id, user_id, title, task_number, due_date)
    VALUES (NEW.id, NEW.user_id, 'Entrar em contato (1ª tentativa)', 1, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_cadence_on_contato
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.create_cadence_task_on_contato();
