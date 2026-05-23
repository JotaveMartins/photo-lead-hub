-- Quick replies for inbox
CREATE TABLE IF NOT EXISTS public.inbox_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.inbox_quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own quick replies"
  ON public.inbox_quick_replies FOR ALL USING (auth.uid() = user_id);

-- Internal notes flag on messages
ALTER TABLE public.inbox_messages ADD COLUMN IF NOT EXISTS is_note boolean DEFAULT false;

-- Last activity timestamp on whatsapp instances
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
