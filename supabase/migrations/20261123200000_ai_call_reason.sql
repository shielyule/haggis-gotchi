-- ai-haggling: why an AI call failed (AWS error type or "rejected by checks"). Names only, never content.
alter table public.ai_calls add column if not exists reason text check (length(reason) <= 120);
