-- Test for 20261116210000_cutover_close_old_paths.sql (runs after phase 1 is live).
-- The runner wraps: begin; <migration>; <this file>; rollback;

insert into auth.users (id, email, aud, role, instance_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@cutover-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.carers (id, display_name) values ('aaaaaaaa-0000-0000-0000-00000000000a', 'a')
  on conflict (id) do nothing;
insert into public.eggs (id, carer_id, ready_at, status, answers, email) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), 'hatched', '{}', 'a@cutover-test.invalid');

do $$
declare n int; v_code text; r jsonb;
begin
  -- 1. register_egg is closed to the public roles
  if has_function_privilege('anon', 'public.register_egg(uuid, timestamptz, text, jsonb)', 'execute')
     or has_function_privilege('authenticated', 'public.register_egg(uuid, timestamptz, text, jsonb)', 'execute') then
    raise exception 'FAIL 1: register_egg still callable';
  end if;

  -- 2. no email left inside answers
  select count(*) into n from public.eggs where answers ? 'email';
  if n <> 0 then raise exception 'FAIL 2: email still in answers'; end if;

  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;

  -- 3. a browser insert cannot pre-set a claim code or living_on
  insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour, living_on, transfer_code, transfer_expires_at)
  values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Testy', 'douce', 8, 18, 22, 'phone', 'HACKED', now() + interval '9 days');
  select count(*) into n from public.children where id = 'aaaaaaaa-2222-0000-0000-000000000001' and living_on = 'mother' and transfer_code is null;
  if n <> 1 then raise exception 'FAIL 3: client set server-only columns on insert'; end if;

  -- 4. a browser update cannot set them either (silently kept), meters still update
  update public.children set transfer_code = 'HACKED', transfer_expires_at = now() + interval '9 days', living_on = 'phone', hunger = 11
   where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  select count(*) into n from public.children where id = 'aaaaaaaa-2222-0000-0000-000000000001' and living_on = 'mother' and transfer_code is null and hunger = 11;
  if n <> 1 then raise exception 'FAIL 4: client changed server-only columns, or meters blocked'; end if;

  -- 5. identity change is refused
  begin
    update public.children set temperament_id = 'fair-wud' where id = 'aaaaaaaa-2222-0000-0000-000000000001';
    raise exception 'FAIL 5: temperament changed';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- 6. the server path still works end to end: mint -> claim -> phone
  select code into v_code from public.mint_transfer_code('aaaaaaaa-2222-0000-0000-000000000001');
  r := public.claim_child_by_code(v_code);
  if not (r->>'ok')::boolean then raise exception 'FAIL 6: mint/claim broken by trigger: %', r; end if;
  reset role;
  select count(*) into n from public.children where id = 'aaaaaaaa-2222-0000-0000-000000000001' and living_on = 'phone';
  if n <> 1 then raise exception 'FAIL 7: claim did not move to phone'; end if;
end
$$;

select 'cutover phase 2: all checks passed' as result;
