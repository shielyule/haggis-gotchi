# Kiro - Design: ai-haggling

## Pieces
- `supabase/functions/_shared/bedrock.ts`: Bedrock Converse call (aws4fetch, `bedrock` service,
  model `amazon.nova-lite-v1:0`, region `AWS_REGION`), 10 s timeout, temperature 0.8, max 200 tokens.
- `supabase/functions/_shared/aiText.ts` (pure): `nearestTown`, `diaryFacts`, `diaryPrompt`,
  `fallbackDiary`, `reactionPrompt`, `fallbackReaction`, `cleanAiLine`, `checkLine`, blocklist.
- `supabase/functions/_shared/riddles.ts` (pure): `RIDDLE_BANK`, `topicFor(day)`, `riddlePrompt`,
  `parseRiddle`, `riddleFor(day)` (bank fallback).
- Edge Function `diary`: cron (hourly at :50) writes due diaries; carer call `{ childId }` for demo eggs.
- Edge Function `riddle`: GET today's riddle (makes it if missing); POST `{ childId, choice }` records the guess.
- `photo-treat`: unmatched photo -> `reaction`.
- Migration: `scrapbook_entries.kind`; `daily_riddles`; `riddle_guesses`; `ai_calls`; check_ins action `riddle`; cron job.
- App: scrapbook sync fix (insert, ignore duplicates, never delete); `/scrapbook` book page (new tab);
  riddle game; demo "Write tonight's diary now"; engine action `riddle`.

## Correctness properties (fast-check)
`supabase/functions/_shared/properties.test.ts` (S15+), `packages/care-engine/test/properties.test.ts` (P29+),
`apps/mother/test/properties.test.ts` (A9+).
- **S15** (R3.6, R4.3, R5.3) For any text, `checkLine` accepts only lines within the length limit that name the
  Haggling and contain no blocked word, link, email or long number; `cleanAiLine` never makes a bad line good.
- **S16** (R3.7, R4.3) For any day of facts, the fallback diary and reaction always pass `checkLine`.
- **S17** (R6.2) For any facts, carer and coordinates, a prompt never contains an email, the carer's name or the coordinates.
- **S18** (R3.3) `nearestTown` returns a town from the list for any coordinates, and a far-away phrase outside the UK.
- **S19** (R3.5) Whenever the day had a storm, the facts say storm first, and the fallback diary mentions the storm.
- **S20** (R5.3, R5.4) `parseRiddle` accepts only riddles that meet every rule; every bank riddle passes;
  `riddleFor` always returns a valid riddle for any day.
- **S21** (R5.2) The topic for a day is the same every time and cycles through every topic.
- **P29** (R5.5, R6.4) A riddle guess changes Mood by +8 (right) or +2 (wrong), never Health XP, at most once a day.
- **A9** (R2.3) For any set of entries, the book's tabs partition them correctly: All has every entry;
  Week n has exactly the entries from that week of life; Diary has exactly the diary entries.
- **A10** (R1.3) Every entry gets exactly one kind.
Not properties: the AI's wording (checked by `checkLine`), the book's look, Bedrock availability.
