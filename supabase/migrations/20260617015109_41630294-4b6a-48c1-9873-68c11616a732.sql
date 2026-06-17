
CREATE OR REPLACE FUNCTION public.zzz_link_inbox_conversations_to_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_key TEXT;
BEGIN
  -- Canonical key: digits only, drop leading 55 if length>11, take last 11
  lead_key := regexp_replace(COALESCE(NEW.whatsapp, ''), '\D', '', 'g');
  IF lead_key IS NULL OR length(lead_key) = 0 THEN
    RETURN NEW;
  END IF;
  IF left(lead_key, 2) = '55' AND length(lead_key) > 11 THEN
    lead_key := substr(lead_key, 3);
  END IF;
  IF length(lead_key) > 11 THEN
    lead_key := right(lead_key, 11);
  END IF;

  UPDATE public.inbox_conversations c
  SET lead_id = NEW.id
  WHERE c.user_id = NEW.user_id
    AND c.lead_id IS NULL
    AND (
      CASE
        WHEN left(regexp_replace(COALESCE(c.contact_number, ''), '\D', '', 'g'), 2) = '55'
             AND length(regexp_replace(COALESCE(c.contact_number, ''), '\D', '', 'g')) > 11
        THEN right(regexp_replace(COALESCE(c.contact_number, ''), '\D', '', 'g'), 11)
        ELSE right(regexp_replace(COALESCE(c.contact_number, ''), '\D', '', 'g'), 11)
      END
    ) = lead_key
    AND length(regexp_replace(COALESCE(c.contact_number, ''), '\D', '', 'g')) > 0;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzz_link_inbox_after_lead_change ON public.leads;

CREATE TRIGGER zzz_link_inbox_after_lead_change
AFTER INSERT OR UPDATE OF whatsapp ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.zzz_link_inbox_conversations_to_lead();
