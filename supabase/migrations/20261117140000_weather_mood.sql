-- weather-mood T6 (17 Nov 2026). Additive. Grants explicit, RLS in the same file.

-- 1. Carer weather settings: consent + COARSE location (0.1 degree, about 11 km) + timezone.
alter table public.carers
  add column if not exists weather_consent boolean not null default false,
  add column if not exists weather_lat numeric(4,1) check (weather_lat between -90 and 90),
  add column if not exists weather_lon numeric(5,1) check (weather_lon between -180 and 180),
  add column if not exists timezone text check (length(timezone) <= 64);

-- Set (consent, rounded here too) or clear (null coordinates = use home place). Owner only.
create or replace function public.set_weather_location(p_lat numeric, p_lon numeric, p_timezone text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  insert into public.carers (id) values (auth.uid()) on conflict (id) do nothing;
  update public.carers
     set weather_consent = (p_lat is not null and p_lon is not null),
         weather_lat = case when p_lat is null then null else round(greatest(-90, least(90, p_lat)), 1) end,
         weather_lon = case when p_lon is null then null else round(greatest(-180, least(180, p_lon)), 1) end,
         timezone = nullif(left(coalesce(p_timezone, ''), 64), '')
   where id = auth.uid();
  return found;
end;
$$;
revoke execute on function public.set_weather_location(numeric, numeric, text) from public, anon;
grant execute on function public.set_weather_location(numeric, numeric, text) to authenticated;

-- 2. Readings recorded by the weather-tick job (an event log; the care engine applies them).
create table if not exists public.weather_readings (
  id bigint generated always as identity primary key,
  carer_id uuid not null references public.carers (id) on delete cascade,
  slot_id text not null check (slot_id ~ '^\d{4}-\d{2}-\d{2}-(am|pm|eve)$'),
  bucket text not null,
  temp_c numeric(4,1),
  wind_kmh numeric(5,1),
  code int,
  place text not null default 'your area' check (length(place) <= 40),
  at timestamptz not null default now(),
  unique (carer_id, slot_id)
);
alter table public.weather_readings enable row level security;
revoke all on public.weather_readings from public, anon, authenticated;
grant select on public.weather_readings to authenticated;
grant select, insert, delete on public.weather_readings to service_role;
drop policy if exists weather_readings_select_own on public.weather_readings;
create policy weather_readings_select_own on public.weather_readings
  for select to authenticated using (auth.uid() = carer_id);

select cron.schedule(
  'purge-weather-readings',
  '29 3 * * *',
  $$delete from public.weather_readings where at < now() - interval '14 days'$$
);

-- 3. Applied slots on the Haggling: browsers may add, never remove (no re-applying).
alter table public.children
  add column if not exists weather_applied text[] not null default '{}';

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
    new.weather_applied := '{}';
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
  new.weather_applied := array(
    select distinct x
      from unnest(coalesce(old.weather_applied, '{}') || coalesce(new.weather_applied, '{}')) as x
     order by x
  );
  return new;
end;
$$;
