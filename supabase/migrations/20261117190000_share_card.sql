-- share-card T1 (17 Nov 2026). Additive.

alter table public.children
  add column if not exists public_id text unique,
  add column if not exists share_enabled boolean not null default true;

-- Backfill: 10 random hex characters, unrelated to name, slug or carer.
update public.children
   set public_id = lower(encode(extensions.gen_random_bytes(5), 'hex'))
 where public_id is null;

-- Protect trigger: public_id is server-made on insert and never changes.
create or replace function public.children_protect_columns()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if tg_op = 'INSERT' and new.public_id is null then
    new.public_id := lower(encode(gen_random_bytes(5), 'hex'));
  end if;

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
    new.public_id := lower(encode(gen_random_bytes(5), 'hex'));
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
  new.public_id := old.public_id;
  new.life_xp := greatest(coalesce(new.life_xp, 0), old.life_xp);
  new.weather_applied := array(
    select distinct x
      from unnest(coalesce(old.weather_applied, '{}') || coalesce(new.weather_applied, '{}')) as x
     order by x
  );
  return new;
end;
$$;

-- The ONLY public read of a Haggling. Card fields only; nothing about the carer.
create or replace function public.public_haggling(p_public_id text)
returns table (
  name text,
  temperament_id text,
  life_xp numeric,
  hunger int,
  mood int,
  energy int,
  mess int,
  health_xp int,
  hatched_at timestamptz,
  share_enabled boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    case when c.share_enabled then c.name end,
    case when c.share_enabled then c.temperament_id end,
    case when c.share_enabled then c.life_xp end,
    case when c.share_enabled then c.hunger end,
    case when c.share_enabled then c.mood end,
    case when c.share_enabled then c.energy end,
    case when c.share_enabled then c.mess end,
    case when c.share_enabled then c.health_xp end,
    case when c.share_enabled then c.created_at end,
    c.share_enabled
  from public.children c
  where p_public_id ~ '^[a-f0-9]{10}$'
    and c.public_id = p_public_id
$$;
revoke execute on function public.public_haggling(text) from public;
grant execute on function public.public_haggling(text) to anon, authenticated;
