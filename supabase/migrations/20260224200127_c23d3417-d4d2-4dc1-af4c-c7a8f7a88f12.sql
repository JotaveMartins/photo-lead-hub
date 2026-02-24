
-- Table for custom interesse options per user
CREATE TABLE public.interesse_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint: no duplicate option names per user
ALTER TABLE public.interesse_options ADD CONSTRAINT interesse_options_user_nome_unique UNIQUE (user_id, nome);

-- Enable RLS
ALTER TABLE public.interesse_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interesse_options"
  ON public.interesse_options FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interesse_options"
  ON public.interesse_options FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interesse_options"
  ON public.interesse_options FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own interesse_options"
  ON public.interesse_options FOR UPDATE
  USING (auth.uid() = user_id);
