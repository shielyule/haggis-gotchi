-- 20 Nov 2026 (owner): real wait 20 s, demo wait 10 s. A short wait no longer means
-- "demo", so demo eggs get an explicit flag, set only by claim-egg (service role).
alter table public.eggs add column if not exists demo boolean not null default false;
update public.eggs set demo = true where ready_at - created_at <= interval '2 minutes' and not demo;

-- Browsers cannot mark their own egg as a demo egg (demo eggs allow fast-forward).
create or replace function public.eggs_protect_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;
  if old.carer_id is not null and new.carer_id is distinct from old.carer_id then
    raise exception 'egg owner cannot be changed';
  end if;
  new.email := old.email;
  new.ready_code_sent_at := old.ready_code_sent_at;
  new.demo := old.demo;
  return new;
end;
$$;

-- Laddie or lassie, chosen at hatch (owner, 20 Nov).
alter table public.children add column if not exists sex text check (sex in ('male', 'female'));
