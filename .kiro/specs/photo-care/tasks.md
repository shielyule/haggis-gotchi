# Kiro - Tasks: photo-care

Not started. Needs owner approval of requirements (two **DECIDE** items) and an AWS account.
Commit format: `photo-care T3: <what>`. Order follows `weather-mood` (owner priority).

- [ ] T1 Owner crib sheet (written to `owner-instructions.md` standard): AWS account, IAM user with the two-action policy, access key into Supabase secrets, budget alarm. Kiro confirms region support and AWS MCP server names from current AWS docs first.
- [ ] T2 Capture real Rekognition responses for test photos (via AWS MCP or CLI) into `supabase/functions/_shared/fixtures/photo/`; settle exact label names per care item
- [ ] T3 `photoMatch.ts` pure matcher + table tests (R2.2-2.4, R3, R4.4, R6.3)
- [ ] T4 Migration `photo_checks` with grants + RLS in the same file; RLS test (R4.1-4.2)
- [ ] T5 Edge Function `photo-care`: auth, ownership, surface check, cap, file checks, Rekognition calls, server-side reward through the care engine, scrapbook line (R2, R4, R5)
- [ ] T6 Client: on-device resize, first-use privacy notice, button + result card on phone and nest (R1, R5.2, R6.2)
- [ ] T7 Extend `secret-guard` hook for AWS key ids; add care items to `scottish-folklore.md` steering
- [ ] T8 Live test with real photos on the phone; record results here
