-- RLS isolation test. security-hardening T1.
-- Run in the Supabase SQL editor on a NON-production project, or on production
-- (everything is rolled back at the end). Any failed check raises an exception.
-- Expected last line: "RLS isolation: all checks passed" then ROLLBACK.
--
-- STATUS: written 16 Nov 2026, not yet executed. Record the result in
-- .kiro/specs/security-hardening/tasks.md when run.

begin;

-- Two throwaway carers. The on_auth_user_created trigger makes their carers rows.
insert into auth.users (id, email, aud, role, instance_id)
values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@rls-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@rls-test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

insert into public.eggs (id, carer_id, ready_at, status, answers, email)
values ('aaaaaaaa-1111-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-00000000000a',
        now(), 'waiting', '{}'::jsonb, 'a@rls-test.invalid');

-- An orphan egg registered with B's email (pre-login claim flow).
insert into public.eggs (id, carer_id, ready_at, status, answers, email)
values ('bbbbbbbb-1111-0000-0000-000000000002',
        null, now(), 'waiting', '{}'::jsonb, 'b@rls-test.invalid');

-- Act as carer B.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","email":"b@rls-test.invalid","role":"authenticated"}',
  true);

do $$
declare n int;
begin
  -- 1. B cannot read A's egg.
  select count(*) into n from public.eggs where id = 'aaaaaaaa-1111-0000-0000-000000000001';
  if n <> 0 then raise exception 'FAIL 1: B can read A egg'; end if;

  -- 2. B cannot update A's egg.
  update public.eggs set status = 'hatched' where id = 'aaaaaaaa-1111-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL 2: B updated A egg'; end if;

  -- 3. B cannot delete A's egg.
  delete from public.eggs where id = 'aaaaaaaa-1111-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL 3: B deleted A egg'; end if;

  -- 4. Attack F: B owns an email-matched orphan egg and tries to hand it to A.
  begin
    update public.eggs set carer_id = 'aaaaaaaa-0000-0000-0000-00000000000a'
      where id = 'bbbbbbbb-1111-0000-0000-000000000002';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL 4: B reassigned an egg to A'; end if;
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if; -- policy violation is the pass case
  end;

  -- 5. B can claim the orphan for themselves.
  update public.eggs set carer_id = 'bbbbbbbb-0000-0000-0000-00000000000b'
    where id = 'bbbbbbbb-1111-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL 5: B cannot claim own orphan egg'; end if;

  -- 6. Once owned, B cannot move it away or change the server-only columns.
  begin
    update public.eggs set carer_id = 'aaaaaaaa-0000-0000-0000-00000000000a'
      where id = 'bbbbbbbb-1111-0000-0000-000000000002';
    raise exception 'FAIL 6: owner changed after claim';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  update public.eggs
     set email = 'victim@example.invalid', ready_code_sent_at = null
   where id = 'bbbbbbbb-1111-0000-0000-000000000002';
  select count(*) into n from public.eggs
   where id = 'bbbbbbbb-1111-0000-0000-000000000002'
     and email = 'b@rls-test.invalid';
  if n <> 1 then raise exception 'FAIL 7: client changed egg email'; end if;

  raise notice 'RLS isolation: all checks passed';
end
$$;

rollback;
