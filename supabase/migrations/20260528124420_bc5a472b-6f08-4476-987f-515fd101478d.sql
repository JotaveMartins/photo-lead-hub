
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove previous schedule if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-meta-ads-daily') THEN
    PERFORM cron.unschedule('sync-meta-ads-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'sync-meta-ads-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cqbewlffoosoexbgldqh.supabase.co/functions/v1/sync-meta-ads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxYmV3bGZmb29zb2V4YmdsZHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDIyMjksImV4cCI6MjA4NTIxODIyOX0.qGudb-EQYCMBVkWlCqV10WI20Duzeg2g7Zp_Q6L9_3s'
    ),
    body := jsonb_build_object(
      'since', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date - INTERVAL '7 days', 'YYYY-MM-DD'),
      'until', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD')
    )
  ) AS request_id;
  $$
);
