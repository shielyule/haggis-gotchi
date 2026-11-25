-- ai-haggling (25 Nov): which AI company answered (Gemini replaced Bedrock; see the AWS incident record).
alter table public.ai_calls add column if not exists provider text check (provider in ('gemini', 'bedrock'));
