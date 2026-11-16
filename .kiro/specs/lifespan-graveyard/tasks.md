# Kiro - Tasks: lifespan-graveyard

Depends on `sync-conflict` T1-T5. Commit format: `lifespan-graveyard T3: <what>`.

- [ ] T1 Confirm span length with the carer (14 days proposed)
- [ ] T2 Migration: columns, insert trigger, `graveyard_entries`, `depart_due_children()`, pg_cron (R1, R2, R4)
- [ ] T3 Engine: departed state, care blocked, `moodDaily`, `toneFor` + tests (R2, R3)
- [ ] T4 Scrapbook wording sets by tone; epitaph templates (R3.2)
- [ ] T5 Nest + phone: countdown, tone background, final page (R1.4, R2.3)
- [ ] T6 Mother graveyard list from `graveyard_entries` (R4)
- [ ] T7 Ghost opt-in prompt and read-only `GhostCard` (R5)
- [ ] T8 Demo controls: `?demo=1` span and dev-only age-up (design Demo)
- [ ] T9 RLS and idempotency tests
