-- Test for 20261117200000_public_feed.sql. Runner wraps begin/rollback.
insert into auth.users (id, email, aud, role, instance_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'fred@feed-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'sally@feed-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
-- Both carers opt in (the public scrapbook is off by default since 19 Nov).
insert into public.carers (id, display_name, show_in_feed) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'fred.private', true), ('bbbbbbbb-0000-0000-0000-00000000000b', 'sally.private', true)
  on conflict (id) do update set display_name = excluded.display_name, show_in_feed = true;
insert into public.eggs (id, carer_id, ready_at, status, answers, email) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), 'hatched', '{"displayName":"Fred"}', 'fred@feed-test.invalid'),
  ('bbbbbbbb-1111-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-00000000000b', now(), 'hatched', '{"displayName":"Sally"}', 'sally@feed-test.invalid');
insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour) values
  ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Harry', 'douce', 8, 18, 22),
  ('bbbbbbbb-2222-0000-0000-000000000002', 'bbbbbbbb-1111-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-00000000000b', 'Twinkle', 'ree', 8, 18, 22);
-- events: Fred fed Harry twice within 5 min (collapse), Sally cuddled Twinkle, a weather check-in (hidden)
insert into public.check_ins (child_id, carer_id, surface, hunger, mood, energy, mess, action, at) values
  ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'phone', 50, 50, 50, 10, 'feed', now() - interval '20 minutes'),
  ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'phone', 60, 50, 50, 10, 'feed', now() - interval '15 minutes'),
  ('bbbbbbbb-2222-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-00000000000b', 'phone', 50, 60, 50, 10, 'cuddle', now() - interval '5 minutes'),
  ('bbbbbbbb-2222-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-00000000000b', 'phone', 50, 60, 50, 10, 'weather', now() - interval '4 minutes');

do $$
declare n int; t text;
begin
  -- Anonymous visitor
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.public_feed() where carer_name in ('Fred', 'Sally');
  if n <> 2 then raise exception 'FAIL 1: expected 2 lines (collapsed, weather hidden), got %', n; end if;
  select string_agg(carer_name || '/' || haggling_name || '/' || action, ',' order by at desc) into t
    from public.public_feed() where carer_name in ('Fred', 'Sally');
  if t <> 'Sally/Twinkle/cuddle,Fred/Harry/feed' then raise exception 'FAIL 2: wrong lines %', t; end if;
  select count(*) into n from public.public_feed() where carer_name like '%@%' or carer_name like '%private%';
  if n <> 0 then raise exception 'FAIL 3: email or carers.display_name leaked'; end if;
  begin
    select count(*) into n from public.check_ins;
    if n > 0 then raise exception 'FAIL 4: anon reads check_ins'; end if;
  exception when insufficient_privilege then null;
  end;

  -- Sally opts out: her lines disappear, past ones too
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  set local role authenticated;
  perform public.set_show_in_feed(false);
  -- and a browser cannot fake a Photo Treat line
  insert into public.check_ins (child_id, carer_id, surface, hunger, mood, energy, mess, action)
  values ('bbbbbbbb-2222-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-00000000000b', 'phone', 100, 100, 100, 0, 'photo_treat');
  reset role;
  select count(*) into n from public.check_ins where action = 'photo_treat' and carer_id = 'bbbbbbbb-0000-0000-0000-00000000000b';
  if n <> 0 then raise exception 'FAIL 5: browser recorded a Photo Treat'; end if;
  set local role anon;
  select count(*) into n from public.public_feed() where carer_name = 'Sally';
  if n <> 0 then raise exception 'FAIL 6: opted-out carer still shown'; end if;

  -- Blocked word hides the line
  reset role;
  update public.children set name = 'Shitbag' where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  set local role anon;
  select count(*) into n from public.public_feed() where carer_name = 'Fred';
  if n <> 0 then raise exception 'FAIL 7: blocked word shown'; end if;
  reset role;
end
$$;

select 'public-feed phase: all checks passed' as result;
