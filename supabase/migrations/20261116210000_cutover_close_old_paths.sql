-- security-hardening T4 + T5, PHASE 2 (cutover).
-- Apply ONLY after the new site (claim-egg + server claim codes) is live on
-- Cloudflare Pages. The old site would stop being able to claim eggs.

-- T4: the old anonymous claim function is switched off. claim-egg is the only way in.
revoke execute on function public.register_egg(uuid, timestamptz, text, jsonb)
  from public, anon, authenticated;

-- T4 (R4.1): email lives only in eggs.email.
update public.eggs set answers = answers - 'email' where answers ? 'email';

-- T5: browsers cannot set where a Haggling lives or invent a claim code, and
-- cannot change its identity. Only the server functions (mint_transfer_code,
-- claim_child_by_code, return_child_to_nest) and the service role can.
create or replace function public.children_protect_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.living_on := 'mother';
    new.transfer_code := null;
    new.transfer_expires_at := null;
    return new;
  end if;

  if new.egg_id is distinct from old.egg_id
     or new.carer_id is distinct from old.carer_id
     or new.temperament_id is distinct from old.temperament_id then
    raise exception 'A Haggling''s identity cannot be changed';
  end if;

  -- Server-controlled: keep stored values silently (old clients do not break).
  new.living_on := old.living_on;
  new.transfer_code := old.transfer_code;
  new.transfer_expires_at := old.transfer_expires_at;
  return new;
end;
$$;

drop trigger if exists children_protect_columns_trg on public.children;
create trigger children_protect_columns_trg
  before insert or update on public.children
  for each row execute function public.children_protect_columns();
