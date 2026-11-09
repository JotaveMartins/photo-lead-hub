-- Run as a Cloud administrator. Read-only investigation, no replay/creation.
-- Replace the all-zero UUID ONLY after confirming Igor's exact account.
-- The contact date was clarified as Nov 7 around 14:00 America/Sao_Paulo.
-- Include Nov 7-9 to cover approximate time and delayed delivery/recovery.
BEGIN READ ONLY;
SET LOCAL diagnostic.igor_user_id = '00000000-0000-0000-0000-000000000000';

SELECT user_id, nome FROM public.profiles
WHERE user_id = current_setting('diagnostic.igor_user_id')::uuid;

SELECT id, name, status FROM public.whatsapp_instances
WHERE user_id = current_setting('diagnostic.igor_user_id')::uuid;

SELECT id, nome, whatsapp, created_at, created_via, deleted_at
FROM public.leads
WHERE user_id = current_setting('diagnostic.igor_user_id')::uuid
  AND (nome ILIKE '%wesley%' OR right(regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g'), 8) = '89758194')
ORDER BY created_at;

SELECT c.id, c.contact_name, c.contact_number, c.contact_lid, c.contact_jid,
  c.status, c.lead_id, c.instance_id, c.created_at, c.updated_at,
  (SELECT count(*) FROM public.inbox_messages m WHERE m.user_id = c.user_id AND m.conversation_id = c.id) AS message_count,
  (SELECT min(coalesce(m.timestamp,m.created_at)) FROM public.inbox_messages m WHERE m.user_id = c.user_id AND m.conversation_id = c.id) AS first_message_at
FROM public.inbox_conversations c
WHERE c.user_id = current_setting('diagnostic.igor_user_id')::uuid
  AND (c.contact_name ILIKE '%wesley%'
    OR right(regexp_replace(c.contact_number, '[^0-9]', '', 'g'), 8) = '89758194'
    OR c.lead_id IN (
      SELECT l.id FROM public.leads l
      WHERE l.user_id = c.user_id
        AND (l.nome ILIKE '%wesley%' OR right(regexp_replace(coalesce(l.whatsapp,''), '[^0-9]', '', 'g'), 8) = '89758194')
    ))
ORDER BY c.created_at;

-- Extract only message metadata. Never return the complete payload: it may
-- contain provider credentials or base64 media. Handle object AND array data.
WITH events AS (
  SELECT w.id, w.created_at, w.instance_key, w.event,
    jsonb_typeof(w.payload::jsonb -> 'data') AS data_shape, item.message
  FROM public.webhook_logs w
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE jsonb_typeof(w.payload::jsonb -> 'data')
      WHEN 'array' THEN w.payload::jsonb -> 'data'
      WHEN 'object' THEN jsonb_build_array(w.payload::jsonb -> 'data')
      ELSE '[]'::jsonb END
  ) AS item(message)
  WHERE w.user_id = current_setting('diagnostic.igor_user_id')::uuid
    AND w.created_at >= '2026-11-07T00:00:00-03:00'::timestamptz
    AND w.created_at < '2026-11-10T00:00:00-03:00'::timestamptz
    AND replace(lower(w.event), '_', '.') = 'messages.upsert'
), candidates AS (
  SELECT e.* FROM events e
  WHERE e.message ->> 'pushName' ILIKE '%wesley%'
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(jsonb_build_array(
        e.message #>> '{key,remoteJid}', e.message #>> '{key,remoteJidAlt}',
        e.message #>> '{key,senderPn}', e.message ->> 'senderPn'
      )) AS jid(value)
      WHERE right(regexp_replace(split_part(jid.value, '@', 1), '[^0-9]', '', 'g'), 8) = '89758194'
    )
)
SELECT id AS webhook_log_id, created_at AS webhook_received_at, instance_key,
  data_shape, message #>> '{key,id}' AS whatsapp_message_id,
  message #>> '{key,remoteJid}' AS remote_jid,
  message #>> '{key,remoteJidAlt}' AS alternate_jid,
  message #>> '{key,fromMe}' AS from_me,
  EXISTS (SELECT 1 FROM public.inbox_messages m
    WHERE m.user_id = current_setting('diagnostic.igor_user_id')::uuid
      AND m.whatsapp_message_id = candidates.message #>> '{key,id}') AS saved_in_inbox
FROM candidates ORDER BY created_at;

SELECT keyword, active FROM public.inbox_triggers
WHERE user_id = current_setting('diagnostic.igor_user_id')::uuid;

SELECT count(*) AS conversation_count FROM public.inbox_conversations
WHERE user_id = current_setting('diagnostic.igor_user_id')::uuid;

COMMIT;
