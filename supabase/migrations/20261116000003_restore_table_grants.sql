-- Fix: DML privileges were stripped from anon/authenticated/service_role
-- (only REFERENCES/TRIGGER/TRUNCATE remained). Edge Functions and the
-- client API then get "permission denied for table eggs".
-- Restores normal Supabase grants; RLS still restricts row access.

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on all tables in schema public to postgres, service_role;
grant all on all tables in schema public to anon, authenticated;

grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;
