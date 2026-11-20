-- Test for 20261120090000_demo_flag_and_sex.sql. Runner wraps begin/rollback.
insert into auth.users (id, email, aud, role, instance_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'd@demo-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.carers (id) values ('aaaaaaaa-0000-0000-0000-00000000000a') on conflict (id) do nothing;
-- server (postgres) creates a real egg with a 20-second wait
insert into public.eggs (id, carer_id, created_at, ready_at, status, answers, email, demo) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), now() + interval '20 seconds', 'waiting', '{}', 'd@demo-test.invalid', false);

do $$
declare n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;
  update public.eggs set demo = true where id = 'aaaaaaaa-1111-0000-0000-000000000001';
  select count(*) into n from public.eggs where id = 'aaaaaaaa-1111-0000-0000-000000000001' and not demo;
  if n <> 1 then raise exception 'FAIL 1: browser marked its egg as a demo egg'; end if;
  insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour, sex)
  values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Lass', 'douce', 8, 18, 22, 'female');
  select count(*) into n from public.children where sex = 'female' and id = 'aaaaaaaa-2222-0000-0000-000000000001';
  if n <> 1 then raise exception 'FAIL 2: sex not stored'; end if;
  reset role;
end
$$;

select 'demo-flag phase: all checks passed' as result;
