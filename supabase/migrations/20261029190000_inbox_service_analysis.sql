-- Called only by the authenticated Edge Function with its service-role client.
CREATE INDEX IF NOT EXISTS inbox_analysis_message_order_idx
ON public.inbox_messages (user_id, conversation_id, (coalesce(timestamp, created_at)), created_at, id)
WHERE is_note IS NOT TRUE;

CREATE OR REPLACE FUNCTION public.get_inbox_analysis_sample(p_user_id uuid, p_entry_message text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  WITH selected AS (
    SELECT c.id, c.contact_name, c.contact_number, first_message.sent_at
    FROM public.inbox_conversations c
    CROSS JOIN LATERAL (
      SELECT m.body, coalesce(m.timestamp, m.created_at) AS sent_at
      FROM public.inbox_messages m
      WHERE m.conversation_id = c.id AND m.user_id = p_user_id
        AND m.direction = 'inbound' AND m.is_note IS NOT TRUE
      ORDER BY coalesce(m.timestamp, m.created_at), m.created_at, m.id
      LIMIT 1
    ) first_message
    WHERE c.user_id = p_user_id AND c.is_group IS NOT TRUE
      AND lower(btrim(regexp_replace(first_message.body, '\s+', ' ', 'g')))
        = lower(btrim(regexp_replace(p_entry_message, '\s+', ' ', 'g')))
    ORDER BY first_message.sent_at DESC, c.id
    LIMIT 20
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'contact_name', s.contact_name,
    'contact_number', s.contact_number,
    'started_at', s.sent_at,
    'messages', (
      SELECT coalesce(jsonb_agg(to_jsonb(history) ORDER BY history.sent_at, history.created_at, history.id), '[]'::jsonb)
      FROM (
        SELECT m.id, m.body, m.direction, m.type,
          coalesce(m.timestamp, m.created_at) AS sent_at, m.created_at
        FROM public.inbox_messages m
        WHERE m.conversation_id = s.id AND m.user_id = p_user_id AND m.is_note IS NOT TRUE
        ORDER BY coalesce(m.timestamp, m.created_at), m.created_at, m.id
        LIMIT 1001
      ) history
    )
  ) ORDER BY s.sent_at DESC, s.id), '[]'::jsonb)
  FROM selected s;
$$;
REVOKE ALL ON FUNCTION public.get_inbox_analysis_sample(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_inbox_analysis_sample(uuid, text) TO service_role;
