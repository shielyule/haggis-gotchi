# Kiro - Tasks: photo-care (Photo Treat + Life XP)

Commit format: `photo-care T3: <what>`.

## Build now (placeholder recognition)
- [ ] T1 Engine: `lifeXp`, `lifeLevel()`, age accrual in `tick`, +1 per care (daily cap), `applyPhotoTreat()`; tests
- [ ] T2 Migration: `children.health_xp`, `life_xp`, `care_xp_day`, `care_xp_today`, `last_treat_day`; grants; test in rollback (also fixes Health XP reset, gap 5)
- [ ] T3 Edge Function `photo-treat`: auth, owner, home device, daily limit, file checks, placeholder recognition, reward through the engine, scrapbook line; live tests
- [ ] T4 Client: Photo Treat button, camera, resize, result card; Level + Life XP on the care screen; cloud mapping

## Later (with AWS)
- [ ] T5 Owner crib sheet: IAM user with only `rekognition:DetectLabels` + `rekognition:DetectText`, keys into Supabase secrets, $5 budget alarm
- [ ] T6 Capture real responses for the treat list; pure matcher + table tests
- [ ] T7 Switch `photo-treat` from placeholder to Rekognition; live test on Android
