-- Test for 20261119180000_sleep_and_private_defaults.sql. Runner wraps begin/rollback.
insert into auth.users (id, email, aud, role, instance_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'zed@sleep-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.carers (id) values ('aaaaaaaa-0000-0000-0000-00000000000a') on conflict (id) do nothing;
insert into public.eggs (id, carer_id, ready_at, status, answers, email) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), 'hatched', '{"displayName":"Zed"}', 'zed@sleep-test.invalid');

do $$
declare n int; t text;
begin
  -- new carer starts out of the public scrapbook
  select count(*) into n from public.carers where id = 'aaaaaaaa-0000-0000-0000-00000000000a' and not show_in_feed;
  if n <> 1 then raise exception 'FAIL 1: new carer is in the public scrapbook by default'; end if;

  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;
  insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour)
  values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Snoozy', 'douce', 8, 18, 22);
  select count(*) into n from public.children where id = 'aaaaaaaa-2222-0000-0000-000000000001' and not share_enabled;
  if n <> 1 then raise exception 'FAIL 2: new public card is on by default'; end if;

  -- browser can put it to bed and record the action
  update public.children set asleep_until = now() + interval '8 hours' where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  select count(*) into n from public.children where id = 'aaaaaaaa-2222-0000-0000-000000000001' and asleep_until > now();
  if n <> 1 then raise exception 'FAIL 3: cannot set asleep_until'; end if;
  insert into public.check_ins (child_id, carer_id, surface, hunger, mood, energy, mess, action)
  values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'phone', 50, 50, 50, 10, 'sleep');

  -- opted in -> the feed shows the bedtime line
  perform public.set_show_in_feed(true);
  reset role;
  set local role anon;
  select action into t from public.public_feed() where carer_name = 'Zed';
  if t is distinct from 'sleep' then raise exception 'FAIL 4: sleep line missing from feed (%)', t; end if;
  reset role;
end
$$;

select 'sleep-defaults phase: all checks passed' as result;
