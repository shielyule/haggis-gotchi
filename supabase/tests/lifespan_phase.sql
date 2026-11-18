-- Test for 20261118100000_lifespan_graveyard.sql. Runner wraps begin/rollback.
insert into auth.users (id, email, aud, role, instance_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@life-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@life-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.carers (id) values ('aaaaaaaa-0000-0000-0000-00000000000a'), ('bbbbbbbb-0000-0000-0000-00000000000b') on conflict (id) do nothing;
insert into public.eggs (id, carer_id, ready_at, status, answers, email) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', now(), 'hatched', '{"displayName":"Ann"}', 'a@life-test.invalid');

do $$
declare n int; r record;
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;
  -- browser tries to start with a long life and an early departure
  insert into public.children (id, egg_id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour, born_at, span_ends_at, departed_at)
  values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
          'Testy', 'ree', 8, 18, 22, now() - interval '400 days', now() + interval '400 days', now());
  select count(*) into n from public.children where id = 'aaaaaaaa-2222-0000-0000-000000000001'
     and born_at > now() - interval '1 minute' and span_ends_at between now() + interval '41 days' and now() + interval '43 days' and departed_at is null;
  if n <> 1 then raise exception 'FAIL 1: browser set its own life dates'; end if;

  update public.children set span_ends_at = now() + interval '999 days', departed_at = now(), epitaph = 'x'
   where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  select count(*) into n from public.children where id = 'aaaaaaaa-2222-0000-0000-000000000001'
     and span_ends_at < now() + interval '43 days' and departed_at is null and epitaph is null;
  if n <> 1 then raise exception 'FAIL 2: browser changed life dates or departure'; end if;

  begin
    insert into public.graveyard_entries (child_id, carer_id, name, temperament_id, born_at, departed_at, days_lived, tone, epitaph)
    values ('aaaaaaaa-2222-0000-0000-000000000001', auth.uid(), 'Fake', 'ree', now(), now(), 1, 'bright', 'x');
    raise exception 'FAIL 3: browser wrote a gravestone';
  exception when insufficient_privilege then null;
  end;

  -- server departs it
  reset role;
  update public.children set departed_at = now(), tone = 'bright', epitaph = 'Testy lived loud.' where id = 'aaaaaaaa-2222-0000-0000-000000000001';
  insert into public.graveyard_entries (child_id, carer_id, name, temperament_id, born_at, departed_at, days_lived, tone, epitaph)
  values ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Testy', 'ree', now(), now(), 42, 'bright', 'Testy lived loud.');

  -- anonymous visitor sees the stone, not the carer
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select * into r from public.public_graveyard() where name = 'Testy';
  if r.epitaph <> 'Testy lived loud.' or r.days_lived <> 42 then raise exception 'FAIL 4: stone not public'; end if;
  begin
    select count(*) into n from public.graveyard_entries;
    if n > 0 then raise exception 'FAIL 5: anon reads graveyard_entries'; end if;
  exception when insufficient_privilege then null;
  end;

  -- other carer cannot read A's private graveyard row
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into n from public.graveyard_entries;
  if n <> 0 then raise exception 'FAIL 6: B reads A graveyard row'; end if;
  reset role;
end
$$;

select 'lifespan phase: all checks passed' as result;
