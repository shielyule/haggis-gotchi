-- Test for 20261117100000_phone_home_treats_reminders.sql. Runner wraps begin/rollback.

insert into auth.users (id, email, aud, role, instance_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@ph-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@ph-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.carers (id, display_name) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a'), ('bbbbbbbb-0000-0000-0000-00000000000b', 'b')
  on conflict (id) do nothing;
insert into public.eggs (id, carer_id, ready_at, status, answers, email) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), 'hatched', '{}', 'a@ph-test.invalid');

do $$
declare n int; ok boolean;
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;

  -- Browser insert cannot preset server-only columns
  insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour, home_device_id, last_treat_day, life_xp, health_xp)
  values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Testy', 'douce', 8, 18, 22, 'evil-device', '2099-01-01', 9999, 42);
  select count(*) into n from public.children where id = 'aaaaaaaa-2222-0000-0000-000000000001'
     and home_device_id is null and last_treat_day is null and life_xp = 0 and health_xp = 42;
  if n <> 1 then raise exception 'FAIL 1: insert set server-only columns (or health_xp not stored)'; end if;

  -- Owner sets home device
  ok := public.set_home_device('aaaaaaaa-2222-0000-0000-000000000001', 'device-aaaa-1234');
  if not ok then raise exception 'FAIL 2: owner could not set home device'; end if;
  ok := public.set_home_device('aaaaaaaa-2222-0000-0000-000000000001', 'bad id!');
  if ok then raise exception 'FAIL 3: malformed device id accepted'; end if;

  -- Browser update: home device / treat day ignored; life_xp up ok, down refused; health_xp writable
  update public.children set life_xp = 120, health_xp = 60 where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  update public.children set life_xp = 5, home_device_id = 'hijack-device', last_treat_day = null
   where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  select count(*) into n from public.children where id = 'aaaaaaaa-2222-0000-0000-000000000001'
     and life_xp = 120 and health_xp = 60 and home_device_id = 'device-aaaa-1234';
  if n <> 1 then raise exception 'FAIL 4: protected columns changed or xp not kept'; end if;

  -- Push subscription via function only
  ok := public.save_push_subscription('https://push.example/abc', 'p256', 'authk', 'Europe/London');
  if not ok then raise exception 'FAIL 5: could not save subscription'; end if;
  ok := public.save_push_subscription('http://insecure.example/x', 'p', 'a', 'UTC');
  if ok then raise exception 'FAIL 6: non-https endpoint accepted'; end if;
  begin
    insert into public.push_subscriptions (carer_id, endpoint, p256dh, auth) values ('aaaaaaaa-0000-0000-0000-00000000000a', 'https://x.example/1', 'p', 'a');
    raise exception 'FAIL 7: direct insert allowed';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from public.push_subscriptions;
  if n <> 1 then raise exception 'FAIL 8: owner cannot see own subscription'; end if;

  -- Carer B: cannot see A's subscription, cannot move A's Haggling, cannot read reminder_log
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into n from public.push_subscriptions;
  if n <> 0 then raise exception 'FAIL 9: B sees A subscription'; end if;
  ok := public.set_home_device('aaaaaaaa-2222-0000-0000-000000000001', 'device-bbbb-1234');
  if ok then raise exception 'FAIL 10: B moved A Haggling'; end if;
  ok := public.delete_push_subscription('https://push.example/abc');
  if ok then raise exception 'FAIL 11: B deleted A subscription'; end if;
  begin
    select count(*) into n from public.reminder_log;
    raise exception 'FAIL 12: authenticated reads reminder_log';
  exception when insufficient_privilege then null;
  end;

  -- Anon cannot call the new functions
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin
    ok := public.set_home_device('aaaaaaaa-2222-0000-0000-000000000001', 'device-anon-1234');
    raise exception 'FAIL 13: anon can call set_home_device';
  exception when insufficient_privilege then null;
  end;
  reset role;
end
$$;

select 'phone-home phase: all checks passed' as result;
