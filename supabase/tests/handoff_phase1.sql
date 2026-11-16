-- Test for 20261116200000_claim_egg_and_handoff.sql. Runs the migration and the
-- checks inside one transaction and ROLLS BACK, so it leaves nothing behind.
-- Run: supabase db query --remote --yes -f supabase/tests/handoff_phase1.sql
-- (the test runner script pastes the migration in front of this file)

insert into auth.users (id, email, aud, role, instance_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@handoff-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@handoff-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.carers (id, display_name) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a'), ('bbbbbbbb-0000-0000-0000-00000000000b', 'b')
  on conflict (id) do nothing;
insert into public.eggs (id, carer_id, ready_at, status, answers, email) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), 'hatched', '{}', 'a@handoff-test.invalid');
insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour) values
  ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Testy', 'douce', 8, 18, 22);

do $$
declare
  v_code text; v_exp timestamptz; r jsonb; n int; ok boolean;
begin
  -- As carer A
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;

  select code, expires_at into v_code, v_exp from public.mint_transfer_code('aaaaaaaa-2222-0000-0000-000000000001');
  if v_code !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'FAIL 1: bad code %', v_code; end if;
  if v_exp < now() + interval '6 days' then raise exception 'FAIL 2: expiry too short'; end if;

  -- Wrong code: uniform failure, recorded
  r := public.claim_child_by_code('ZZZZZZ');
  if (r->>'ok')::boolean then raise exception 'FAIL 3: wrong code accepted'; end if;

  -- Right code, typed lower-case with a space: accepted, single use
  r := public.claim_child_by_code(lower(substr(v_code,1,3)) || ' ' || substr(v_code,4));
  if not (r->>'ok')::boolean then raise exception 'FAIL 4: right code refused: %', r; end if;
  r := public.claim_child_by_code(v_code);
  if (r->>'ok')::boolean then raise exception 'FAIL 5: code worked twice'; end if;

  reset role;
  select count(*) into n from public.children where id = 'aaaaaaaa-2222-0000-0000-000000000001' and living_on = 'phone' and transfer_code is null;
  if n <> 1 then raise exception 'FAIL 6: not moved to phone / code not cleared'; end if;

  -- Expired code is refused
  update public.children set transfer_code = 'EXPIRD', transfer_expires_at = now() - interval '1 minute' where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;
  r := public.claim_child_by_code('EXPIRD');
  if (r->>'ok')::boolean then raise exception 'FAIL 7: expired code accepted'; end if;

  -- Return to nest
  ok := public.return_child_to_nest('aaaaaaaa-2222-0000-0000-000000000001');
  if not ok then raise exception 'FAIL 8: owner could not return to nest'; end if;

  -- As carer B: cannot mint, claim, or return A's Haggling
  reset role;
  update public.children set transfer_code = 'BBTEST', transfer_expires_at = now() + interval '1 day' where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  set local role authenticated;
  begin
    perform public.mint_transfer_code('aaaaaaaa-2222-0000-0000-000000000001');
    raise exception 'FAIL 9: B minted for A';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  r := public.claim_child_by_code('BBTEST');
  if (r->>'ok')::boolean then raise exception 'FAIL 10: B claimed A with a valid code'; end if;
  ok := public.return_child_to_nest('aaaaaaaa-2222-0000-0000-000000000001');
  if ok then raise exception 'FAIL 11: B returned A Haggling'; end if;

  -- B: 5 failures lock further tries (B has 1 failure so far)
  r := public.claim_child_by_code('AAAAAA'); r := public.claim_child_by_code('AAAAAA');
  r := public.claim_child_by_code('AAAAAA'); r := public.claim_child_by_code('AAAAAA');
  r := public.claim_child_by_code('AAAAAA');
  if r->>'error' not like 'Too many tries%' then raise exception 'FAIL 12: no lockout: %', r; end if;

  -- B cannot read the rate-limit table
  begin
    select count(*) into n from public.claim_attempts;
    raise exception 'FAIL 13: authenticated can read claim_attempts';
  exception when insufficient_privilege then null;
  end;

  -- Signed out: functions refuse
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin
    r := public.claim_child_by_code('BBTEST');
    raise exception 'FAIL 14: anon can call claim_child_by_code';
  exception when insufficient_privilege then null;
  end;

  reset role;
  raise notice 'handoff phase 1: all checks passed';
end
$$;

select 'handoff phase 1: all checks passed' as result;
