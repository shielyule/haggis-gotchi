-- Haggis-gotchi — initial schema (run in Supabase SQL editor)
-- One Haggling, many surfaces. Never a twin.

create extension if not exists "pgcrypto";

-- Carer profile (1:1 with auth.users)
create table if not exists public.carers (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.carers enable row level security;

create policy "carers_select_own"
  on public.carers for select
  using (auth.uid() = id);

create policy "carers_insert_own"
  on public.carers for insert
  with check (auth.uid() = id);

create policy "carers_update_own"
  on public.carers for update
  using (auth.uid() = id);

-- Eggs / birth claims
create table if not exists public.eggs (
  id uuid primary key default gen_random_uuid(),
  carer_id uuid not null references public.carers (id) on delete cascade,
  created_at timestamptz not null default now(),
  ready_at timestamptz not null,
  status text not null check (status in ('waiting', 'ready', 'hatched'))
    default 'waiting',
  story_id text,
  answers jsonb not null default '{}'::jsonb
);

create index if not exists eggs_carer_id_idx on public.eggs (carer_id);

alter table public.eggs enable row level security;

create policy "eggs_own_all"
  on public.eggs for all
  using (auth.uid() = carer_id)
  with check (auth.uid() = carer_id);

-- Living child (Haggling) — one row per egg
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  egg_id uuid not null unique references public.eggs (id) on delete cascade,
  carer_id uuid not null references public.carers (id) on delete cascade,
  name text not null,
  temperament_id text not null,
  breakfast_hour int not null check (breakfast_hour between 0 and 23),
  dinner_hour int not null check (dinner_hour between 0 and 23),
  bed_hour int not null check (bed_hour between 0 and 23),
  hunger int not null default 72 check (hunger between 0 and 100),
  mood int not null default 78 check (mood between 0 and 100),
  energy int not null default 70 check (energy between 0 and 100),
  mess int not null default 12 check (mess between 0 and 100),
  living_on text not null check (living_on in ('mother', 'phone'))
    default 'mother',
  last_tick_at timestamptz not null default now(),
  transfer_code text unique,
  transfer_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists children_carer_id_idx on public.children (carer_id);
create index if not exists children_transfer_code_idx on public.children (transfer_code);

alter table public.children enable row level security;

create policy "children_own_all"
  on public.children for all
  using (auth.uid() = carer_id)
  with check (auth.uid() = carer_id);

-- Public claim by transfer code (phone before/during login)
-- Locked down: only code + non-sensitive columns via RPC later.
-- For v1 phone claim after magic-link, carer_id match is enough.

create table if not exists public.scrapbook_entries (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  carer_id uuid not null references public.carers (id) on delete cascade,
  at timestamptz not null default now(),
  text text not null
);

create index if not exists scrapbook_child_id_idx
  on public.scrapbook_entries (child_id, at desc);

alter table public.scrapbook_entries enable row level security;

create policy "scrapbook_own_all"
  on public.scrapbook_entries for all
  using (auth.uid() = carer_id)
  with check (auth.uid() = carer_id);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  carer_id uuid not null references public.carers (id) on delete cascade,
  surface text not null check (surface in ('mother', 'phone', 'pi')),
  hunger int not null,
  mood int not null,
  energy int not null,
  mess int not null,
  at timestamptz not null default now()
);

create index if not exists check_ins_child_id_idx
  on public.check_ins (child_id, at desc);

alter table public.check_ins enable row level security;

create policy "check_ins_own_all"
  on public.check_ins for all
  using (auth.uid() = carer_id)
  with check (auth.uid() = carer_id);

-- Auto-create carer row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.carers (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
