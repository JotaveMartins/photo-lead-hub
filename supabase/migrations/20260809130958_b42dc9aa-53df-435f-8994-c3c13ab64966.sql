
CREATE POLICY "own photo files select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own photo files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own photo files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'project-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own photo files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
