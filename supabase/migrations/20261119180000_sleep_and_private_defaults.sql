-- 19 Nov 2026 (owner feedback). Additive.
-- 1. Public card and public scrapbook start OFF for new carers / Hagglings.
--    Existing rows keep their current choice (Firecracker's card is already shared).
alter table public.children alter column share_enabled set default false;
alter table public.carers alter column show_in_feed set default false;

-- 2. Sleep: "Put to bed" for 8 hours (care engine decides; browsers may set it).
alter table public.children add column if not exists asleep_until timestamptz;

-- 3. Feed line for bedtime ("Fred just put Harry to bed").
alter table public.check_ins drop constraint if exists check_ins_action_check;
alter table public.check_ins add constraint check_ins_action_check
  check (action in ('feed', 'cuddle', 'walk', 'treat', 'clean', 'photo_treat', 'weather', 'sleep'));

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
       and ci.action in ('feed', 'cuddle', 'walk', 'treat', 'clean', 'photo_treat', 'sleep')
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
