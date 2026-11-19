-- Test for 20261119220000_graveyard_all_stones.sql. Runner wraps begin/rollback.
insert into auth.users (id, email, aud, role, instance_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'quiet@stone-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.carers (id, show_in_feed) values ('aaaaaaaa-0000-0000-0000-00000000000a', false)
  on conflict (id) do update set show_in_feed = false;
insert into public.eggs (id, carer_id, ready_at, status, answers, email) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), 'hatched', '{"displayName":"Quiet"}', 'quiet@stone-test.invalid');
insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour, share_enabled, departed_at)
values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Hushabye', 'douce', 8, 18, 22, false, now());
insert into public.graveyard_entries (child_id, carer_id, name, temperament_id, born_at, departed_at, days_lived, tone, epitaph)
values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Hushabye', 'douce', now() - interval '42 days', now(), 42, 'bright', 'Hushabye lived loud.');

do $$
declare n int; r record;
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  -- carer is NOT in the public scrapbook, but the stone shows
  select count(*) into n from public.public_graveyard() where name = 'Hushabye';
  if n <> 1 then raise exception 'FAIL 1: stone hidden for a carer outside the scrapbook'; end if;
  -- card switched off: no memorial link
  select * into r from public.public_graveyard() where name = 'Hushabye';
  if r.public_id is not null then raise exception 'FAIL 2: memorial link shown with the card off'; end if;
  reset role;
end
$$;

select 'graveyard all-stones phase: all checks passed' as result;
