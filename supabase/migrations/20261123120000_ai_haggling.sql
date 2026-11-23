-- ai-haggling (23 Nov 2026), spec .kiro/specs/ai-haggling. Additive.
-- 1. Every scrapbook page is kept, with a kind (R1.3).
alter table public.scrapbook_entries
  add column if not exists kind text not null default 'care'
  check (kind in ('care', 'diary', 'photo', 'riddle', 'weather', 'milestone'));
create index if not exists scrapbook_entries_child_at on public.scrapbook_entries (child_id, at desc);

-- 2. One folklore riddle per day for everyone (R5.1-R5.3). Server only: the answer never reaches a browser.
create table if not exists public.daily_riddles (
  day date primary key,
  topic text not null check (length(topic) <= 60),
  question text not null check (length(question) between 10 and 300),
  options text[] not null check (array_length(options, 1) = 3),
  answer int not null check (answer between 0 and 2),
  explain text not null check (length(explain) <= 200),
  source text not null check (source in ('ai', 'bank')),
  created_at timestamptz not null default now()
);
alter table public.daily_riddles enable row level security;
revoke all on public.daily_riddles from anon, authenticated;
grant all on public.daily_riddles to service_role;

-- 3. One guess per Haggling per day (R5.5). Carers may read their own; only the server writes.
create table if not exists public.riddle_guesses (
  child_id uuid not null references public.children (id) on delete cascade,
  carer_id uuid not null references public.carers (id) on delete cascade,
  day date not null,
  choice int not null check (choice between 0 and 2),
  correct boolean not null,
  at timestamptz not null default now(),
  primary key (child_id, day)
);
alter table public.riddle_guesses enable row level security;
drop policy if exists riddle_guesses_select_own on public.riddle_guesses;
create policy riddle_guesses_select_own on public.riddle_guesses
  for select to authenticated using (auth.uid() = carer_id);
revoke all on public.riddle_guesses from anon, authenticated;
grant select on public.riddle_guesses to authenticated;
grant all on public.riddle_guesses to service_role;

-- 4. AI call log for the daily cap (R6.1). Server only. Kept 30 days.
create table if not exists public.ai_calls (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('diary', 'reaction', 'riddle')),
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists ai_calls_at on public.ai_calls (at);
alter table public.ai_calls enable row level security;
revoke all on public.ai_calls from anon, authenticated;
grant all on public.ai_calls to service_role;

-- 5. Riddle guesses are check-ins too (Mood change, kept out of the public feed).
alter table public.check_ins drop constraint if exists check_ins_action_check;
alter table public.check_ins add constraint check_ins_action_check
  check (action in ('feed', 'cuddle', 'walk', 'treat', 'clean', 'photo_treat', 'weather', 'sleep', 'play', 'scold', 'riddle'));

-- 6. Jobs: diary every hour at :50 (each carer's 21:00 is picked inside); purge the call log.
select cron.unschedule(jobid) from cron.job where jobname in ('diary', 'purge-ai-calls');
select cron.schedule(
  'diary',
  '50 * * * *',
  $$ select net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url') || '/diary', headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')), body := '{}'::jsonb); $$
);
select cron.schedule('purge-ai-calls', '41 3 * * *', $$delete from public.ai_calls where at < now() - interval '30 days'$$);
