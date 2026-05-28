
CREATE TABLE public.google_calendar_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  google_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_connections TO authenticated;
GRANT ALL ON public.google_calendar_connections TO service_role;

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own google connection"
ON public.google_calendar_connections FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own google connection"
ON public.google_calendar_connections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own google connection"
ON public.google_calendar_connections FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own google connection"
ON public.google_calendar_connections FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_google_calendar_connections_updated_at
BEFORE UPDATE ON public.google_calendar_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS google_event_id TEXT;
