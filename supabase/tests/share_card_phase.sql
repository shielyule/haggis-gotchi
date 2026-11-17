-- Test for 20261117190000_share_card.sql. Runner wraps begin/rollback.
insert into auth.users (id, email, aud, role, instance_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@card-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.carers (id, display_name) values ('aaaaaaaa-0000-0000-0000-00000000000a', 'a') on conflict (id) do nothing;
insert into public.eggs (id, carer_id, ready_at, status, answers, email) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), 'hatched', '{"displayName":"Secret Name"}', 'a@card-test.invalid');

do $$
declare n int; pid text; r record;
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;
  insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour, public_id)
  values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Testy', 'radge', 8, 18, 22, 'chosen0000');
  select public_id into pid from public.children where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  if pid is null or pid = 'chosen0000' or pid !~ '^[a-f0-9]{10}$' then raise exception 'FAIL 1: public id not server-made: %', pid; end if;

  update public.children set public_id = 'aaaaaaaaaa' where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  select count(*) into n from public.children where public_id = pid;
  if n <> 1 then raise exception 'FAIL 2: browser changed public id'; end if;

  -- Anonymous visitor reads card fields only
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select * into r from public.public_haggling(pid);
  if r.name <> 'Testy' or r.temperament_id <> 'radge' or not r.share_enabled then raise exception 'FAIL 3: card not readable'; end if;
  begin
    select count(*) into n from public.children;
    if n > 0 then raise exception 'FAIL 4: anon can read children'; end if;
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from public.public_haggling('not-an-id');
  if n <> 0 then raise exception 'FAIL 5: bad id returned a row'; end if;

  -- Owner switches it off: stats hidden
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;
  update public.children set share_enabled = false where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  reset role;
  set local role anon;
  select * into r from public.public_haggling(pid);
  if r.share_enabled or r.name is not null or r.mood is not null then raise exception 'FAIL 6: disabled card shows data'; end if;
  reset role;
end
$$;

select 'share-card phase: all checks passed' as result;
