-- Review fixes (22 Nov 2026). Additive.

-- 1. Public graveyard: hide stones whose Haggling name contains a blocked word
--    (the same list that protects the public scrapbook).
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
   where not exists (
     select 1 from public.feed_blocklist b
      where lower(g.name) like '%' || b.word || '%' or lower(g.epitaph) like '%' || b.word || '%'
   )
   order by g.departed_at desc
   limit 100
$$;
revoke execute on function public.public_graveyard() from public;
grant execute on function public.public_graveyard() to anon, authenticated;

-- 2. Quiet nights (owner tick box): no reminders 22:00-07:00 local, max 6 a day.
alter table public.push_subscriptions
  add column if not exists quiet_hours boolean not null default false;

create or replace function public.set_quiet_hours(p_on boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_on is null then
    return false;
  end if;
  update public.push_subscriptions set quiet_hours = p_on where carer_id = auth.uid();
  return found;
end;
$$;
revoke execute on function public.set_quiet_hours(boolean) from public, anon;
grant execute on function public.set_quiet_hours(boolean) to authenticated;

-- 3. New care actions: the Haggis Run mini-game and Scold.
alter table public.check_ins drop constraint if exists check_ins_action_check;
alter table public.check_ins add constraint check_ins_action_check
  check (action in ('feed', 'cuddle', 'walk', 'treat', 'clean', 'photo_treat', 'weather', 'sleep', 'play', 'scold'));

drop function if exists public.public_feed();
create function public.public_feed()
returns table (carer_name text, haggling_name text, action text, treat_id text, at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  with ev as (
    select ci.at, ci.action, ci.treat_id, ci.carer_id, ci.child_id,
           left(c.name, 40) as hname,
           left(coalesce(nullif(trim(e.answers->>'displayName'), ''), 'A carer'), 40) as cname
      from public.check_ins ci
      join public.children c on c.id = ci.child_id
      join public.eggs e on e.id = c.egg_id
      join public.carers k on k.id = ci.carer_id
     where k.show_in_feed
       and ci.action in ('feed', 'cuddle', 'walk', 'treat', 'clean', 'photo_treat', 'sleep', 'play')
       and ci.at > now() - interval '48 hours'
  ), marked as (
    select ev.*, lag(ev.at) over (partition by ev.carer_id, ev.child_id, ev.action order by ev.at) as prev
      from ev
  )
  select m.cname, m.hname, m.action, m.treat_id, m.at
    from marked m
   where (m.prev is null or m.at - m.prev > interval '10 minutes')
     and not exists (
       select 1 from public.feed_blocklist b
        where lower(m.cname) like '%' || b.word || '%' or lower(m.hname) like '%' || b.word || '%'
     )
   order by m.at desc
   limit 10
$$;
revoke execute on function public.public_feed() from public;
grant execute on function public.public_feed() to anon, authenticated;
