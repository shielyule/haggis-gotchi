-- Egg-ready emails (works even if the browser is closed)
-- Run this in Supabase → SQL Editor → New query → Run

alter table public.eggs
  alter column carer_id drop not null;

alter table public.eggs
  add column if not exists email text;

alter table public.eggs
  add column if not exists ready_code_sent_at timestamptz;

create index if not exists eggs_ready_notify_idx
  on public.eggs (ready_at)
  where ready_code_sent_at is null and status in ('waiting', 'ready');

-- Allow claim before magic-code verify (carer_id filled in later)
create or replace function public.register_egg(
  p_id uuid,
  p_ready_at timestamptz,
  p_story_id text,
  p_answers jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  v_email := lower(trim(coalesce(p_answers->>'email', '')));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'email required';
  end if;

  insert into public.eggs (
    id, carer_id, created_at, ready_at, status, story_id, answers, email
  ) values (
    p_id,
    auth.uid(), -- null if not signed in yet
    now(),
    p_ready_at,
    'waiting',
    p_story_id,
    p_answers,
    v_email
  )
  on conflict (id) do update set
    ready_at = excluded.ready_at,
    story_id = excluded.story_id,
    answers = excluded.answers,
    email = excluded.email;

  return p_id;
end;
$$;

grant execute on function public.register_egg(uuid, timestamptz, text, jsonb)
  to anon, authenticated;

-- After magic-code sign-in, attach orphan eggs to this carer
create or replace function public.claim_my_eggs_by_email()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  v_email := lower(trim(coalesce(auth.jwt()->>'email', '')));
  if v_email = '' then
    return 0;
  end if;

  insert into public.carers (id, display_name)
  values (auth.uid(), split_part(v_email, '@', 1))
  on conflict (id) do nothing;

  update public.eggs
  set carer_id = auth.uid()
  where carer_id is null
    and lower(email) = v_email;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.claim_my_eggs_by_email() to authenticated;

-- Replace eggs policies so email-matched carers can read after login
drop policy if exists "eggs_own_all" on public.eggs;

create policy "eggs_select_own"
  on public.eggs for select
  using (
    auth.uid() = carer_id
    or lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

create policy "eggs_update_own"
  on public.eggs for update
  using (
    auth.uid() = carer_id
    or lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

create policy "eggs_delete_own"
  on public.eggs for delete
  using (auth.uid() = carer_id);
