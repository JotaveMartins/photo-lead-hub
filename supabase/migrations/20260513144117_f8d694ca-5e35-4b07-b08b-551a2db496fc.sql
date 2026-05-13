-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ai-files', 'ai-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow users to upload their own files
CREATE POLICY "Users can upload their own AI files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-files' AND auth.uid() = owner);

-- Policy to allow users to view their own files
CREATE POLICY "Users can view their own AI files"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-files' AND auth.uid() = owner);

-- Policy to allow users to delete their own files
CREATE POLICY "Users can delete their own AI files"
ON storage.objects FOR DELETE
USING (bucket_id = 'ai-files' AND auth.uid() = owner);
