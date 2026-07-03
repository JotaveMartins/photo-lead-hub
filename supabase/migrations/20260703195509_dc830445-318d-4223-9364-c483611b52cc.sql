CREATE TABLE public.meta_ad_creatives (
  ad_id TEXT PRIMARY KEY,
  ad_account_id TEXT NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  thumbnail_url TEXT,
  image_url TEXT,
  permalink_url TEXT,
  creative_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meta_ad_creatives_client ON public.meta_ad_creatives(client_id);
CREATE INDEX idx_meta_ad_creatives_account ON public.meta_ad_creatives(ad_account_id);

GRANT SELECT ON public.meta_ad_creatives TO authenticated;
GRANT ALL ON public.meta_ad_creatives TO service_role;

ALTER TABLE public.meta_ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ad creatives"
  ON public.meta_ad_creatives FOR SELECT
  TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_meta_ad_creatives_updated_at
  BEFORE UPDATE ON public.meta_ad_creatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();