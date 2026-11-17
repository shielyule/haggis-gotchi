-- phone-home T1, photo-care T2, care-reminders T2 (17 Nov 2026).
-- Additive. Grants are explicit (default grants for new objects were removed 16 Nov).

-- 1. Haggling columns
alter table public.children
  add column if not exists home_device_id text,
  add column if not exists health_xp int not null default 50 check (health_xp between -100 and 100),
  add column if not exists life_xp numeric(10,2) not null default 0 check (life_xp >= 0),
  add column if not exists last_treat_day text;

-- 2. Server-only columns now include home device and treat day; Life XP never goes down.
create or replace function public.children_protect_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.living_on := 'mother';
    new.transfer_code := null;
    new.transfer_expires_at := null;
    new.home_device_id := null;
    new.last_treat_day := null;
    new.life_xp := 0;
    return new;
  end if;

  if new.egg_id is distinct from old.egg_id
     or new.carer_id is distinct from old.carer_id
     or new.temperament_id is distinct from old.temperament_id then
    raise exception 'A Haggling''s identity cannot be changed';
  end if;

  new.living_on := old.living_on;
  new.transfer_code := old.transfer_code;
  new.transfer_expires_at := old.transfer_expires_at;
  new.home_device_id := old.home_device_id;
  new.last_treat_day := old.last_treat_day;
  new.life_xp := greatest(coalesce(new.life_xp, 0), old.life_xp);
  return new;
end;
$$;

-- 3. Home device (phone-home R4-R5). Owner only. Not a security boundary.
create or replace function public.set_home_device(p_child_id uuid, p_device_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_device_id !~ '^[A-Za-z0-9-]{8,64}$' then
    return false;
  end if;
  update public.children
     set home_device_id = p_device_id, living_on = 'phone'
   where id = p_child_id and carer_id = auth.uid();
  return found;
end;
$$;
revoke execute on function public.set_home_device(uuid, text) from public, anon;
grant execute on function public.set_home_device(uuid, text) to authenticated;

-- 4. Push subscriptions (care-reminders). Written only through the two functions below.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  carer_id uuid not null references public.carers (id) on delete cascade,
  endpoint text not null unique check (length(endpoint) between 10 and 1000),
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  timezone text not null default 'Europe/London' check (length(timezone) <= 64),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_carer_idx on public.push_subscriptions (carer_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon, authenticated;
grant select on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;
drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated using (auth.uid() = carer_id);

create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_timezone text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_endpoint !~ '^https://' then
    return false;
  end if;
  insert into public.carers (id) values (auth.uid()) on conflict (id) do nothing;
  -- One device, one subscription: whoever is signed in on it now owns it.
  insert into public.push_subscriptions (carer_id, endpoint, p256dh, auth, timezone)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, coalesce(nullif(p_timezone, ''), 'Europe/London'))
  on conflict (endpoint) do update
    set carer_id = excluded.carer_id, p256dh = excluded.p256dh,
        auth = excluded.auth, timezone = excluded.timezone;
  return true;
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_subscriptions where endpoint = p_endpoint and carer_id = auth.uid();
  return found;
end;
$$;
revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke execute on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- 5. Reminder dedupe log. Service role only.
create table if not exists public.reminder_log (
  key text primary key check (length(key) <= 200),
  at timestamptz not null default now()
);
alter table public.reminder_log enable row level security;
revoke all on public.reminder_log from public, anon, authenticated;
grant select, insert, delete on public.reminder_log to service_role;

select cron.schedule(
  'purge-reminder-log',
  '23 3 * * *',
  $$delete from public.reminder_log where at < now() - interval '7 days'$$
);
