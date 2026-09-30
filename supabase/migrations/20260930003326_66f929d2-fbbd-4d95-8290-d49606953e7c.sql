ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS arquivo_contrato_path text;

UPDATE public.contratos
SET arquivo_contrato_path = split_part(substring(arquivo_contrato_url from '/storage/v1/object/(?:public|sign)/contratos/(.+)$'), '?', 1)
WHERE arquivo_contrato_path IS NULL
  AND arquivo_contrato_url ~ '/storage/v1/object/(public|sign)/contratos/.+';

DROP POLICY IF EXISTS "Authenticated users can upload contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON storage.objects;

CREATE POLICY "Contratos: owner or admin read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contratos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Contratos: owner or admin insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contratos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Contratos: owner or admin update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'contratos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')))
WITH CHECK (bucket_id = 'contratos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Contratos: owner or admin delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contratos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

UPDATE public.entregas SET etapa = 'Ensaio Realizado' WHERE etapa = 'Ensaio Agendado';
UPDATE public.entregas SET etapa = 'Em edição' WHERE etapa = 'Prévia enviada';