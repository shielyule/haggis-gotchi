-- Test for 20261123120000_ai_haggling.sql. Runner wraps begin/rollback.
insert into auth.users (id, email, aud, role, instance_id) values
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'a@ai-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.carers (id) values ('bbbbbbbb-0000-0000-0000-00000000000b') on conflict (id) do nothing;
insert into public.eggs (id, carer_id, ready_at, status, answers, email) values
  ('bbbbbbbb-1111-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', now(), 'hatched', '{}', 'a@ai-test.invalid');
insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour) values
  ('bbbbbbbb-2222-0000-0000-000000000001', 'bbbbbbbb-1111-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 'Wee Yin', 'douce', 8, 18, 21);
insert into public.daily_riddles (day, topic, question, options, answer, explain, source) values
  ('2026-11-23', 'kelpie', 'I live in the loch and look like a horse. What am I?', array['A kelpie','A selkie','A brownie'], 0, 'A kelpie is a water horse.', 'bank');
insert into public.riddle_guesses (child_id, carer_id, day, choice, correct) values
  ('bbbbbbbb-2222-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', '2026-11-23', 0, true);
insert into public.scrapbook_entries (id, child_id, carer_id, at, text, kind) values
  (gen_random_uuid(), 'bbbbbbbb-2222-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', now(), 'Dear diary', 'diary');
do $$
declare n int; ok boolean;
begin
  -- old rows default to 'care'
  insert into public.scrapbook_entries (id, child_id, carer_id, at, text) values
    (gen_random_uuid(), 'bbbbbbbb-2222-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', now(), 'Fed');
  select count(*) into n from public.scrapbook_entries where child_id = 'bbbbbbbb-2222-0000-0000-000000000001' and kind = 'care';
  if n <> 1 then raise exception 'FAIL 1: default kind should be care'; end if;
  begin
    insert into public.scrapbook_entries (id, child_id, carer_id, at, text, kind) values
      (gen_random_uuid(), 'bbbbbbbb-2222-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', now(), 'x', 'nope');
    raise exception 'FAIL 2: unknown kind accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.riddle_guesses (child_id, carer_id, day, choice, correct) values
      ('bbbbbbbb-2222-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', '2026-11-23', 1, false);
    raise exception 'FAIL 3: second guess on the same day accepted';
  exception when unique_violation then null;
  end;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  set local role authenticated;
  begin
    select count(*) into n from public.daily_riddles;
    raise exception 'FAIL 4: a carer can read the riddle answers';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from public.riddle_guesses;
  if n <> 1 then raise exception 'FAIL 5: carer cannot see own guess'; end if;
  begin
    insert into public.riddle_guesses (child_id, carer_id, day, choice, correct) values
      ('bbbbbbbb-2222-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', '2026-11-24', 0, true);
    raise exception 'FAIL 6: a carer can write their own guess';
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into n from public.ai_calls;
    raise exception 'FAIL 7: a carer can read the AI call log';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from public.scrapbook_entries where kind = 'diary';
  if n <> 1 then raise exception 'FAIL 8: carer cannot read own diary page'; end if;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin
    select count(*) into n from public.riddle_guesses;
    raise exception 'FAIL 9: anon can read guesses';
  exception when insufficient_privilege then null;
  end;
  reset role;
  insert into public.check_ins (child_id, carer_id, surface, hunger, mood, energy, mess, action) values
    ('bbbbbbbb-2222-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 'phone', 50, 58, 50, 10, 'riddle');
  select count(*) into n from cron.job where jobname = 'diary' and schedule = '50 * * * *';
  if n <> 1 then raise exception 'FAIL 10: diary job not scheduled'; end if;
end
$$;
select 'ai-haggling phase: all checks passed' as result;
