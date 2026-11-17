-- Test for 20261117210000_photo_recognition.sql (runner wraps begin/rollback).
insert into auth.users (id, email, aud, role, instance_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'billy@pr-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.carers (id) values ('aaaaaaaa-0000-0000-0000-00000000000a') on conflict (id) do nothing;
insert into public.eggs (id, carer_id, ready_at, status, answers, email) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), 'hatched', '{"displayName":"Billy"}', 'billy@pr-test.invalid');
insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour) values
  ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Tigger', 'ree', 8, 18, 22);
-- server (this session = postgres) records a real treat
insert into public.check_ins (child_id, carer_id, surface, hunger, mood, energy, mess, action, treat_id)
values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'phone', 100, 100, 100, 0, 'photo_treat', 'irn-bru');
insert into public.claim_attempts (kind, key) values ('photo_check', 'x');
do $$
declare n int; t text;
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select treat_id into t from public.public_feed() where carer_name = 'Billy';
  if t is distinct from 'irn-bru' then raise exception 'FAIL 1: feed has no treat (%)', t; end if;
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;
  insert into public.check_ins (child_id, carer_id, surface, hunger, mood, energy, mess, action, treat_id)
  values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'phone', 50, 50, 50, 0, 'feed', 'kilt');
  reset role;
  select count(*) into n from public.check_ins where carer_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and treat_id = 'kilt';
  if n <> 0 then raise exception 'FAIL 2: browser set a treat'; end if;
end
$$;
select 'photo-recognition phase: all checks passed' as result;
