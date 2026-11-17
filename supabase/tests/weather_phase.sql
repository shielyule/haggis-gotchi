-- Test for 20261117140000_weather_mood.sql. Runner wraps begin/rollback.
insert into auth.users (id, email, aud, role, instance_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@wx-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@wx-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.carers (id, display_name) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a'), ('bbbbbbbb-0000-0000-0000-00000000000b', 'b')
  on conflict (id) do nothing;
insert into public.eggs (id, carer_id, ready_at, status, answers, email) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), 'hatched', '{}', 'a@wx-test.invalid');
insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour)
values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Testy', 'douce', 8, 18, 22);
insert into public.weather_readings (carer_id, slot_id, bucket) values ('aaaaaaaa-0000-0000-0000-00000000000a', '2026-11-17-am', 'rain');

do $$
declare n int; ok boolean;
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;

  -- precise coordinates are rounded to 0.1 degree on the server too
  ok := public.set_weather_location(55.86424, -4.25181, 'Europe/London');
  select count(*) into n from public.carers where id = auth.uid() and weather_consent and weather_lat = 55.9 and weather_lon = -4.3 and timezone = 'Europe/London';
  if n <> 1 then raise exception 'FAIL 1: not rounded / consent not stored'; end if;

  -- withdrawing consent deletes the location
  ok := public.set_weather_location(null, null, 'Europe/London');
  select count(*) into n from public.carers where id = auth.uid() and not weather_consent and weather_lat is null and weather_lon is null;
  if n <> 1 then raise exception 'FAIL 2: location not cleared'; end if;

  -- applied slots: browser can add, never remove
  update public.children set weather_applied = '{2026-11-17-am}' where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  update public.children set weather_applied = '{}' where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  update public.children set weather_applied = '{2026-11-17-pm}' where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  select count(*) into n from public.children where id = 'aaaaaaaa-2222-0000-0000-000000000001' and weather_applied = '{2026-11-17-am,2026-11-17-pm}';
  if n <> 1 then raise exception 'FAIL 3: applied slots removed or not merged'; end if;

  -- owner reads own readings, cannot write them
  select count(*) into n from public.weather_readings;
  if n <> 1 then raise exception 'FAIL 4: owner cannot read own reading'; end if;
  begin
    insert into public.weather_readings (carer_id, slot_id, bucket) values (auth.uid(), '2026-11-17-pm', 'sunny');
    raise exception 'FAIL 5: browser inserted a reading';
  exception when insufficient_privilege then null;
  end;

  -- carer B sees nothing of A
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into n from public.weather_readings;
  if n <> 0 then raise exception 'FAIL 6: B sees A readings'; end if;
  select count(*) into n from public.carers where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
  if n <> 0 then raise exception 'FAIL 7: B sees A carer row (location)'; end if;

  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin
    ok := public.set_weather_location(1, 1, 'UTC');
    raise exception 'FAIL 8: anon can set a location';
  exception when insufficient_privilege then null;
  end;
  reset role;
end
$$;

select 'weather phase: all checks passed' as result;
