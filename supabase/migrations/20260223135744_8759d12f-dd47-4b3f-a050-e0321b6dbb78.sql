
-- Schedule daily document reminder emails at 09:00 Paraguay time (UTC-3 = 12:00 UTC)
SELECT cron.schedule(
  'daily-doc-reminders',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://npekpdkywsneylddzzuu.supabase.co/functions/v1/daily-doc-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZWtwZGt5d3NuZXlsZGR6enV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDYxNDEsImV4cCI6MjA3MTk4MjE0MX0.RNuHThLkvwMzq6WMUna7P6WFUovG2CwT18LNJwtwNoI"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
