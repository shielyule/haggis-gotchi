-- lifespan-graveyard T2 (18 Nov 2026). Additive. 6-week life decided by owner.

alter table public.children
  add column if not exists born_at timestamptz,
  add column if not exists span_ends_at timestamptz,
  add column if not exists departed_at timestamptz,
  add column if not exists ghost_opt_in boolean,
  add column if not exists tone text check (tone in ('bright', 'dim', 'dark')),
  add column if not exists epitaph text check (length(epitaph) <= 300);

update public.children
   set born_at = coalesce(born_at, created_at),
       span_ends_at = coalesce(span_ends_at, created_at + interval '42 days')
 where born_at is null or span_ends_at is null;

-- Protect trigger: life dates and departure are server-only and immutable to browsers.
create or replace function public.children_protect_columns()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if tg_op = 'INSERT' then
    if new.public_id is null then
      new.public_id := lower(encode(gen_random_bytes(5), 'hex'));
    end if;
    if new.born_at is null then new.born_at := now(); end if;
    if new.span_ends_at is null then new.span_ends_at := new.born_at + interval '42 days'; end if;
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
    new.born_at := now();
    new.span_ends_at := now() + interval '42 days';
    new.departed_at := null;
    new.ghost_opt_in := null;
    new.tone := null;
    new.epitaph := null;
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
  new.born_at := old.born_at;
  new.span_ends_at := old.span_ends_at;
  new.departed_at := old.departed_at;
  new.ghost_opt_in := old.ghost_opt_in;
  new.tone := old.tone;
  new.epitaph := old.epitaph;
  new.life_xp := greatest(coalesce(new.life_xp, 0), old.life_xp);
  new.weather_applied := array(
    select distinct x
      from unnest(coalesce(old.weather_applied, '{}') || coalesce(new.weather_applied, '{}')) as x
     order by x
  );
  return new;
end;
$$;

-- Graveyard: one stone per departed Haggling. Written by the lifecycle function (service role).
create table if not exists public.graveyard_entries (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null unique references public.children (id) on delete cascade,
  carer_id uuid not null references public.carers (id) on delete cascade,
  name text not null,
  temperament_id text not null,
  born_at timestamptz not null,
  departed_at timestamptz not null,
  days_lived int not null,
  tone text not null,
  epitaph text not null,
  last_pages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists graveyard_departed_idx on public.graveyard_entries (departed_at desc);
alter table public.graveyard_entries enable row level security;
revoke all on public.graveyard_entries from public, anon, authenticated;
grant select on public.graveyard_entries to authenticated;
grant select, insert, update, delete on public.graveyard_entries to service_role;
drop policy if exists graveyard_select_own on public.graveyard_entries;
create policy graveyard_select_own on public.graveyard_entries
  for select to authenticated using (auth.uid() = carer_id);

-- Public graveyard (mother page, and later the 3D graveyard): stones only, no carer details.
-- Honours the same opt-out as the public scrapbook.
create or replace function public.public_graveyard()
returns table (
  name text, temperament_id text, days_lived int, tone text, epitaph text,
  departed_at timestamptz, public_id text, ghost boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select g.name, g.temperament_id, g.days_lived, g.tone, g.epitaph, g.departed_at,
         case when c.share_enabled then c.public_id end, coalesce(c.ghost_opt_in, false)
    from public.graveyard_entries g
    join public.children c on c.id = g.child_id
    join public.carers k on k.id = g.carer_id
   where k.show_in_feed
   order by g.departed_at desc
   limit 100
$$;
revoke execute on function public.public_graveyard() from public;
grant execute on function public.public_graveyard() to anon, authenticated;

-- Public card becomes a memorial after departure.
drop function if exists public.public_haggling(text);
create function public.public_haggling(p_public_id text)
returns table (
  name text, temperament_id text, life_xp numeric, hunger int, mood int, energy int, mess int,
  health_xp int, hatched_at timestamptz, share_enabled boolean,
  departed_at timestamptz, epitaph text, ghost boolean
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
    c.share_enabled,
    case when c.share_enabled then c.departed_at end,
    case when c.share_enabled then c.epitaph end,
    case when c.share_enabled then coalesce(c.ghost_opt_in, false) end
  from public.children c
  where p_public_id ~ '^[a-f0-9]{10}$'
    and c.public_id = p_public_id
$$;
revoke execute on function public.public_haggling(text) from public;
grant execute on function public.public_haggling(text) to anon, authenticated;
