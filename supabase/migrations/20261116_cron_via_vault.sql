-- security-hardening T3: the cron job authenticates with a dedicated secret kept
-- in Supabase Vault. The service-role key must NOT appear in cron SQL.
--
-- BEFORE running this file, once, in the Supabase SQL editor (values are yours,
-- never commit them):
--
--   select vault.create_secret('<long random string, 32+ chars>', 'cron_secret');
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'functions_base_url');
--
-- and set the same random string on the function:
--
--   supabase secrets set CRON_SECRET=<same long random string>
--
-- Step-by-step: docs/SECURITY-SETUP.md

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Remove the old job that carried the service-role key in plain SQL.
do $$
begin
  perform cron.unschedule('notify-ready-eggs');
exception when others then
  null; -- job did not exist
end
$$;

select cron.schedule(
  'notify-ready-eggs',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url')
           || '/notify-ready-eggs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);
