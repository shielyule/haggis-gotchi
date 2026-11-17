# Kiro - Tasks: photo-care (Photo Treat + Life XP)

Commit format: `photo-care T3: <what>`.

## Build now (placeholder recognition)
- [~] T1 Engine: `lifeXp`, `lifeLevel()`, age accrual in `tick`, +1 per care (daily cap), `applyPhotoTreat()`; tests — 7 tests pass
- [~] T2 Migration: `children.health_xp`, `life_xp`, `care_xp_day`, `care_xp_today`, `last_treat_day`; grants; test in rollback (also fixes Health XP reset, gap 5) — applied live; covered by the phone-home SQL test
- [~] T3 Edge Function `photo-treat`: auth, owner, home device, daily limit, file checks, placeholder recognition, reward through the engine, scrapbook line; live tests — deployed; live: GET 405, no/fake token 401; success path needs a signed-in phone
- [~] T4 Client: Photo Treat button, camera, resize, result card; Level + Life XP on the care screen; cloud mapping — built

## Later (with AWS)
- [x] T5 Owner done 17 Nov (secret names AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION confirmed in Supabase). Crib sheet (`docs/AWS-SETUP.md`, 17 Nov; region + pricing checked; AWS docs MCP added to `.kiro/settings/mcp.json`). Waiting for owner. Was:: IAM user with only `rekognition:DetectLabels` + `rekognition:DetectText`, keys into Supabase secrets, $5 budget alarm
- [ ] T6 Capture real responses for the treat list; pure matcher + table tests
- [ ] T7 Switch `photo-treat` from placeholder to Rekognition; live test on Android

Legend: [x] verified on a phone, [~] built and server-tested, phone test pending, [ ] not started.
