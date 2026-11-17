# Kiro - Tasks: photo-care (Photo Treat + Life XP)

Commit format: `photo-care T3: <what>`.

## Build now (placeholder recognition)
- [~] T1 Engine: `lifeXp`, `lifeLevel()`, age accrual in `tick`, +1 per care (daily cap), `applyPhotoTreat()`; tests — 7 tests pass
- [~] T2 Migration: `children.health_xp`, `life_xp`, `care_xp_day`, `care_xp_today`, `last_treat_day`; grants; test in rollback (also fixes Health XP reset, gap 5) — applied live; covered by the phone-home SQL test
- [~] T3 Edge Function `photo-treat`: auth, owner, home device, daily limit, file checks, placeholder recognition, reward through the engine, scrapbook line; live tests — deployed; live: GET 405, no/fake token 401; success path needs a signed-in phone
- [~] T4 Client: Photo Treat button, camera, resize, result card; Level + Life XP on the care screen; cloud mapping — built

## Later (with AWS)
- [x] T5 Owner done 17 Nov (secret names AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION confirmed in Supabase). Crib sheet (`docs/AWS-SETUP.md`, 17 Nov; region + pricing checked; AWS docs MCP added to `.kiro/settings/mcp.json`). Waiting for owner. Was:: IAM user with only `rekognition:DetectLabels` + `rekognition:DetectText`, keys into Supabase secrets, $5 budget alarm
- [x] T6 Captured 15 real Rekognition answers (9 treats, 6 controls) via a dev probe; matcher + 16 tests. Was: Capture real responses for the treat list; pure matcher + table tests
- [~] T7 Switched 17 Nov: photo-treat uses Rekognition (throttle retry, 10 checks/carer/day, treat-specific lines, feed names the treat). Live check through deployed code: Irn-Bru 100%, bagpipes 99%, Coke can refused. Phone test pending. Was: Switch `photo-treat` from placeholder to Rekognition; live test on Android

Legend: [x] verified on a phone, [~] built and server-tested, phone test pending, [ ] not started.

## Evidence-based decisions (17 Nov)
- Treat list (owner asked for 3-5): **Irn-Bru, bagpipes, kilt/tartan, heather, shortbread**. Unicorn (statue seen as "Monument") and whisky (bottle only "Bottle 55%"; Irn-Bru can itself scored "Alcohol 100") left out until better evidence.
- Irn-Bru by **text** only (a Coke can is also "Can 99"); text threshold 75% (logo read at 79.8%).
- Heather = Purple >= 85 + Flower/Plant >= 90 (Rekognition has no "Heather" label).
- People allowed in photos (kilts and pipers always include one). R6.3 "refuse faces" dropped; photos are still never stored and no face recognition is used.
- Known miss: one kilt photo (Skirt 90, Tartan 56).
