-- Create storage bucket for inbox media files (50 MB cap, public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('inbox-media', 'inbox-media', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Public read policy (service-role uploads bypass RLS, no need for write policies)
DROP POLICY IF EXISTS "inbox-media public read" ON storage.objects;
CREATE POLICY "inbox-media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inbox-media');
