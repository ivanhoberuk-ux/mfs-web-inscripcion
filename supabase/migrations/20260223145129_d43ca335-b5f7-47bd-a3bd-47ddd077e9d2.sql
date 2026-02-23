
-- Store anon key in vault (removes it from hardcoded SQL)
SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZWtwZGt5d3NuZXlsZGR6enV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDYxNDEsImV4cCI6MjA3MTk4MjE0MX0.RNuHThLkvwMzq6WMUna7P6WFUovG2CwT18LNJwtwNoI',
  'supabase_anon_key',
  'Supabase anon key for pg_cron edge function calls'
);

-- Recreate cron job reading key from vault (no hardcoded credentials)
SELECT cron.schedule(
  'daily-doc-reminders',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://npekpdkywsneylddzzuu.supabase.co/functions/v1/daily-doc-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1)
    ),
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
