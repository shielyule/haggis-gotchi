-- Test for 20261122100000_review_fixes.sql. Runner wraps begin/rollback.
insert into auth.users (id, email, aud, role, instance_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'r@review-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.carers (id, show_in_feed) values ('aaaaaaaa-0000-0000-0000-00000000000a', true)
  on conflict (id) do update set show_in_feed = true;
insert into public.eggs (id, carer_id, ready_at, status, answers, email) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), 'hatched', '{"displayName":"Rab"}', 'r@review-test.invalid'),
  ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), 'hatched', '{"displayName":"Rab"}', 'r@review-test.invalid');
insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour, departed_at) values
  ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Shitbag', 'radge', 8, 18, 22, now()),
  ('aaaaaaaa-2222-0000-0000-000000000002', 'aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Bonnie', 'douce', 8, 18, 22, now());
insert into public.graveyard_entries (child_id, carer_id, name, temperament_id, born_at, departed_at, days_lived, tone, epitaph) values
  ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Shitbag', 'radge', now(), now(), 42, 'bright', 'x'),
  ('aaaaaaaa-2222-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Bonnie', 'douce', now(), now(), 42, 'bright', 'Bonnie lived loud.');
insert into public.push_subscriptions (carer_id, endpoint, p256dh, auth) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'https://push.example/review', 'p', 'a');
insert into public.check_ins (child_id, carer_id, surface, hunger, mood, energy, mess, action) values
  ('aaaaaaaa-2222-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-00000000000a', 'phone', 50, 50, 50, 10, 'play'),
  ('aaaaaaaa-2222-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-00000000000a', 'phone', 50, 40, 50, 10, 'scold');

do $$
declare n int; t text;
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.public_graveyard() where name = 'Shitbag';
  if n <> 0 then raise exception 'FAIL 1: blocked name on the public graveyard'; end if;
  select count(*) into n from public.public_graveyard() where name = 'Bonnie';
  if n <> 1 then raise exception 'FAIL 2: clean stone hidden'; end if;
  select string_agg(action, ',') into t from public.public_feed() where carer_name = 'Rab';
  if t is distinct from 'play' then raise exception 'FAIL 3: feed should show play and hide scold, got %', t; end if;
  reset role;

  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;
  if not public.set_quiet_hours(true) then raise exception 'FAIL 4: cannot set quiet hours'; end if;
  reset role;
  select count(*) into n from public.push_subscriptions where endpoint = 'https://push.example/review' and quiet_hours;
  if n <> 1 then raise exception 'FAIL 5: quiet hours not stored'; end if;
end
$$;

select 'review-fixes phase: all checks passed' as result;
