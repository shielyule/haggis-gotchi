-- photo-care T7 (17 Nov 2026): real recognition. Additive.

-- 1. Cost cap: count photo checks per carer (10 a day) in the existing rate-limit log.
alter table public.claim_attempts drop constraint if exists claim_attempts_kind_check;
alter table public.claim_attempts add constraint claim_attempts_kind_check
  check (kind in ('claim_email', 'claim_ip', 'code_fail', 'photo_check'));

-- 2. Which treat a Photo Treat was (for the public feed). Server-only, like 'photo_treat'.
alter table public.check_ins
  add column if not exists treat_id text
  check (treat_id in ('irn-bru', 'bagpipes', 'kilt', 'heather', 'shortbread'));

create or replace function public.check_ins_protect_action()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    if new.action = 'photo_treat' then
      new.action := null; -- only the photo-treat function records treats
    end if;
    new.treat_id := null;
  end if;
  return new;
end;
$$;

-- 3. Feed now says which treat ("Billy just shared a can of Irn-Bru with Tigger").
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
       and ci.action in ('feed', 'cuddle', 'walk', 'treat', 'clean', 'photo_treat')
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
