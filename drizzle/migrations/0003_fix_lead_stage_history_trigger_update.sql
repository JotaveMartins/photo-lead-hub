-- O gatilho AFTER UPDATE OF stage_id não dispara quando a mudança de stage_id
-- é feita pelo gatilho BEFORE (a coluna não consta no SET do UPDATE).
-- Recria sem filtro de coluna; a guarda IS DISTINCT FROM já evita registros indevidos.
DROP TRIGGER IF EXISTS zzz_lead_stage_history ON public.leads;
CREATE TRIGGER zzz_lead_stage_history
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.zzz_lead_stage_history();