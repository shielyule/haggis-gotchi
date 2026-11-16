-- security-hardening T4 + T5, PHASE 1 (additive: safe while the old site is live).
-- Phase 2 (cutover) is 20261116210000_cutover_close_old_paths.sql, applied AFTER
-- the new site is deployed.

-- 1. Future tables are no longer reachable by the public API roles automatically.
--    (Narrows 20261116_restore_table_grants.sql for FUTURE objects only. Existing
--    tables keep their grants; RLS still guards rows. Supabase guidance since
--    30 Oct 2026: grant each role only what it needs, next to the RLS policy.)
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- 2. Rate-limit log. Written only by the claim-egg Edge Function (service role)
--    and by claim_child_by_code below. Nobody else can read or write it.
create table if not exists public.claim_attempts (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('claim_email', 'claim_ip', 'code_fail')),
  key text not null,          -- sha-256 of email or IP; carer id for code_fail
  at timestamptz not null default now()
);
create index if not exists claim_attempts_lookup_idx
  on public.claim_attempts (kind, key, at desc);
alter table public.claim_attempts enable row level security;
revoke all on public.claim_attempts from public, anon, authenticated;
grant select, insert, delete on public.claim_attempts to service_role;

-- Keep it small: delete entries older than 2 days, nightly.
select cron.schedule(
  'purge-claim-attempts',
  '17 3 * * *',
  $$delete from public.claim_attempts where at < now() - interval '2 days'$$
);

-- 3. Mint a phone claim code on the server (T5). Owner only, 7-day expiry.
create or replace function public.mint_transfer_code(p_child_id uuid)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 symbols, no 0/O/1/I
  v_code text;
  v_bytes bytea;
  v_exp timestamptz := now() + interval '7 days';
  i int;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  perform 1 from public.children where id = p_child_id and carer_id = auth.uid();
  if not found then
    raise exception 'Not found.' using errcode = '42501';
  end if;

  loop
    v_bytes := gen_random_bytes(6);
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    begin
      update public.children
         set transfer_code = v_code, transfer_expires_at = v_exp
       where id = p_child_id;
      exit;
    exception when unique_violation then
      null; -- code already in use somewhere: draw again
    end;
  end loop;

  return query select v_code, v_exp;
end;
$$;

-- 4. Phone claims with a code (T5). Signed-in owner only, unexpired, single use,
--    5 wrong tries per 15 minutes, the same message for every kind of failure.
create or replace function public.claim_child_by_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_fails int;
  v_child uuid;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in first.');
  end if;

  select count(*) into v_fails
    from public.claim_attempts
   where kind = 'code_fail' and key = v_uid::text and at > now() - interval '15 minutes';
  if v_fails >= 5 then
    return jsonb_build_object('ok', false, 'error', 'Too many tries. Wait 15 minutes, then try again.');
  end if;

  update public.children
     set living_on = 'phone', transfer_code = null, transfer_expires_at = null
   where transfer_code = v_code
     and carer_id = v_uid
     and transfer_expires_at > now()
  returning id into v_child;

  if v_child is null then
    insert into public.claim_attempts (kind, key) values ('code_fail', v_uid::text);
    return jsonb_build_object('ok', false,
      'error', 'That code did not work. Check it, or make a new one on your nest.');
  end if;

  return jsonb_build_object('ok', true, 'child_id', v_child);
end;
$$;

-- 5. Bring a Haggling back from the phone to the nest. Owner only.
create or replace function public.return_child_to_nest(p_child_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  update public.children
     set living_on = 'mother', transfer_code = null, transfer_expires_at = null
   where id = p_child_id and carer_id = auth.uid();
  return found;
end;
$$;

revoke execute on function public.mint_transfer_code(uuid) from public, anon;
revoke execute on function public.claim_child_by_code(text) from public, anon;
revoke execute on function public.return_child_to_nest(uuid) from public, anon;
grant execute on function public.mint_transfer_code(uuid) to authenticated;
grant execute on function public.claim_child_by_code(text) to authenticated;
grant execute on function public.return_child_to_nest(uuid) to authenticated;
