CREATE POLICY "Users manage own carousel renders"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'carousel-renders' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'carousel-renders' AND (storage.foldername(name))[1] = auth.uid()::text);