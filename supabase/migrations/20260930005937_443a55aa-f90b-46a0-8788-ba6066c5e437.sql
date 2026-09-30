-- Backfill idempotente (Sprint 03): vincula cobranças antigas somente com correspondência inequívoca
WITH c AS (
  SELECT c.id, c.user_id,
         lower(btrim(regexp_replace(coalesce(c.descricao,''), '^\s*Entrada\s*-\s*', '', 'i'))) AS k
  FROM public.cobrancas c
  WHERE c.service_id IS NULL AND c.package_id IS NULL
), m AS (
  SELECT c.id,
    (SELECT array_agg(s.id) FROM public.services s WHERE s.user_id = c.user_id AND lower(btrim(s.nome)) = c.k) AS sids,
    (SELECT array_agg(p.id) FROM public.packages p WHERE p.user_id = c.user_id AND lower(btrim(p.nome)) = c.k) AS pids
  FROM c WHERE c.k <> ''
), u1 AS (
  UPDATE public.cobrancas x SET service_id = m.sids[1]
  FROM m WHERE x.id = m.id AND cardinality(m.sids) = 1 AND m.pids IS NULL
    AND x.service_id IS NULL AND x.package_id IS NULL
  RETURNING 1
)
UPDATE public.cobrancas x SET package_id = m.pids[1]
FROM m WHERE x.id = m.id AND cardinality(m.pids) = 1 AND m.sids IS NULL
  AND x.service_id IS NULL AND x.package_id IS NULL;

-- Integridade entre contas: serviço/pacote precisa pertencer ao mesmo user_id da cobrança
CREATE OR REPLACE FUNCTION public.zzz_validate_cobranca_item_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.service_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.services s WHERE s.id = NEW.service_id AND s.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Serviço não pertence à mesma conta da cobrança' USING ERRCODE = '23514';
  END IF;
  IF NEW.package_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.packages p WHERE p.id = NEW.package_id AND p.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Pacote não pertence à mesma conta da cobrança' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.zzz_validate_cobranca_item_owner() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zzz_validate_cobranca_item_owner ON public.cobrancas;
CREATE TRIGGER zzz_validate_cobranca_item_owner
BEFORE INSERT OR UPDATE OF service_id, package_id, user_id ON public.cobrancas
FOR EACH ROW EXECUTE FUNCTION public.zzz_validate_cobranca_item_owner();