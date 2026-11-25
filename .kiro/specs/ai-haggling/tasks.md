# Kiro - Tasks: ai-haggling
- [x] T1 Migration: scrapbook kind, daily_riddles, riddle_guesses, ai_calls, check_ins 'riddle', diary cron (R1.3, R5, R6.1)
- [x] T2 Pure helpers: aiText.ts, riddles.ts + properties S15-S21 (R3, R4, R5, R6.2)
- [x] T3 bedrock.ts + Edge Function `diary` (R3)
- [x] T4 Edge Function `riddle` + engine action `riddle` + P29 (R5)
- [x] T5 photo-treat "What's that?" reaction (R4)
- [x] T6 Scrapbook sync fix (R1.1, R1.2)
- [x] T7 Book page `/scrapbook` + tabs + A9, A10 (R2)
- [x] T8 Care screen: Open the scrapbook, Riddle game, demo diary button (R2.1, R3.9, R5)
  Verified 23 Nov on the live server with a throwaway demo account: diary (storm over Oban, fallback),
  riddle (answer hidden until guessed, second guess refused), pages saved with kinds; account deleted.
- [x] T9 Owner: Bedrock permission on the AWS user. Worked, but AWS quota is 0 (incident record).
- [x] T9b Owner: Gemini key (paid project) in Supabase (`docs/GEMINI-SETUP.md`), 25 Nov
- [x] T10 Live test (25 Nov, Gemini, throwaway demo account, deleted): one probe call first; diary x3 and photo reaction x4
  written by Gemini; 1 blocked by Google's safety filter and 1 cut off: both fell back to written lines; 3 riddles valid
- [x] T11 Owner book cover art + opening film + single page (23-24 Nov)
- [ ] T12 Owner Android check: diary (demo menu), photo of a dog or plant, riddle tomorrow (first Gemini riddle)
