-- public-feed T1 (17 Nov 2026). Additive.

-- 1. What happened in each check-in (feed verbs). Browsers cannot claim a Photo Treat.
alter table public.check_ins
  add column if not exists action text
  check (action in ('feed', 'cuddle', 'walk', 'treat', 'clean', 'photo_treat', 'weather'));

create or replace function public.check_ins_protect_action()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin')
     and new.action = 'photo_treat' then
    new.action := null; -- only the photo-treat function records treats
  end if;
  return new;
end;
$$;
drop trigger if exists check_ins_protect_action_trg on public.check_ins;
create trigger check_ins_protect_action_trg
  before insert or update on public.check_ins
  for each row execute function public.check_ins_protect_action();

-- 2. Opt-out (owner decision: a tick box, on by default).
alter table public.carers
  add column if not exists show_in_feed boolean not null default true;

create or replace function public.set_show_in_feed(p_show boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_show is null then
    return false;
  end if;
  insert into public.carers (id) values (auth.uid()) on conflict (id) do nothing;
  update public.carers set show_in_feed = p_show where id = auth.uid();
  return found;
end;
$$;
revoke execute on function public.set_show_in_feed(boolean) from public, anon;
grant execute on function public.set_show_in_feed(boolean) to authenticated;

-- 3. Blocked words (service role manages; nobody else can read it).
create table if not exists public.feed_blocklist (word text primary key check (word = lower(word)));
alter table public.feed_blocklist enable row level security;
revoke all on public.feed_blocklist from public, anon, authenticated;
grant select, insert, delete on public.feed_blocklist to service_role;
insert into public.feed_blocklist (word) values
  ('fuck'), ('shit'), ('cunt'), ('bitch'), ('wank'), ('twat'), ('bastard'), ('piss')
on conflict do nothing;

-- 4. The ONLY public read: last 10 events, names + action + time. Never email/slug/place.
create or replace function public.public_feed()
returns table (carer_name text, haggling_name text, action text, at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  with ev as (
    select ci.at, ci.action, ci.carer_id, ci.child_id,
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
  select m.cname, m.hname, m.action, m.at
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
