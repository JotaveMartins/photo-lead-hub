
-- 1) Helper: canonical key for a WhatsApp number (Brazil-aware)
CREATE OR REPLACE FUNCTION public.whatsapp_match_key(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE d text;
BEGIN
  d := regexp_replace(COALESCE(raw, ''), '\D', '', 'g');
  IF d IS NULL OR length(d) = 0 THEN RETURN ''; END IF;
  IF left(d, 2) = '55' AND length(d) > 11 THEN d := substr(d, 3); END IF;
  IF length(d) > 11 THEN d := right(d, 11); END IF;
  -- Collapse Brazilian mobile 11-digit (DDD + 9 + 8 digits) → 10-digit (DDD + 8)
  IF length(d) = 11 AND substr(d, 3, 1) = '9' THEN
    d := substr(d, 1, 2) || substr(d, 4);
  END IF;
  RETURN d;
END;
$$;

-- 2) Update trigger function to use the new key
CREATE OR REPLACE FUNCTION public.zzz_link_inbox_conversations_to_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE lead_key text;
BEGIN
  lead_key := public.whatsapp_match_key(NEW.whatsapp);
  IF lead_key = '' THEN RETURN NEW; END IF;

  UPDATE public.inbox_conversations c
     SET lead_id = NEW.id
   WHERE c.user_id = NEW.user_id
     AND c.lead_id IS NULL
     AND public.whatsapp_match_key(c.contact_number) = lead_key;

  RETURN NEW;
END;
$$;

-- 3) One-off backfill: link existing orphan conversations to leads using the new key
UPDATE public.inbox_conversations c
   SET lead_id = l.id
  FROM public.leads l
 WHERE c.lead_id IS NULL
   AND l.deleted_at IS NULL
   AND c.user_id = l.user_id
   AND public.whatsapp_match_key(c.contact_number) = public.whatsapp_match_key(l.whatsapp)
   AND public.whatsapp_match_key(l.whatsapp) <> '';
