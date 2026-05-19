do $$
begin
  if exists (select 1 from cron.job where jobname = 'vencer-lista-espera-diario') then
    perform cron.unschedule('vencer-lista-espera-diario');
  end if;
  perform cron.schedule(
    'vencer-lista-espera-diario',
    '0 11 * * *',
    $cmd$select net.http_post(
      url:='https://npekpdkywsneylddzzuu.supabase.co/functions/v1/vencer-lista-espera',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name='CRON_SECRET' limit 1)
      ),
      body:='{}'::jsonb
    ) as request_id;$cmd$
  );
end$$;