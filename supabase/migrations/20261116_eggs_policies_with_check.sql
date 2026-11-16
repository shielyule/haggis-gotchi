-- security-hardening T6 (R6): an update policy without WITH CHECK lets a matching
-- user rewrite columns such as carer_id. Assume the gap is real and close it.
--
-- 1. WITH CHECK: after any client update the row must belong to the caller.
-- 2. A trigger stops clients touching columns only the server may change.
--
-- Service role and SECURITY DEFINER functions (register_egg,
-- claim_my_eggs_by_email) run as a privileged role and pass through.

drop policy if exists "eggs_update_own" on public.eggs;
create policy "eggs_update_own"
  on public.eggs for update
  using (
    auth.uid() = carer_id
    or (carer_id is null
        and lower(email) = lower(coalesce(auth.jwt()->>'email', '')))
  )
  with check (auth.uid() = carer_id);

create or replace function public.eggs_protect_columns()
returns trigger
language plpgsql
as $$
begin
  -- Server-side callers are trusted.
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  -- Ownership can be claimed once (null -> me, enforced by WITH CHECK) but never moved.
  if old.carer_id is not null and new.carer_id is distinct from old.carer_id then
    raise exception 'egg owner cannot be changed';
  end if;

  -- Server-controlled columns: silently keep the stored values.
  new.email := old.email;
  new.ready_code_sent_at := old.ready_code_sent_at;
  return new;
end;
$$;

drop trigger if exists eggs_protect_columns_trg on public.eggs;
create trigger eggs_protect_columns_trg
  before update on public.eggs
  for each row execute function public.eggs_protect_columns();
