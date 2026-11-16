# Kiro - Tasks: sync-conflict

Run in this order. Commit message format: `sync-conflict T3: <what>`.

- [x] T1 `packages/care-engine` created (types, rules, health, tick, merge). Apps import through one shim, `apps/mother/src/lib/engine.ts` (relative path; no alias needed)
- [x] T2 Decay, care and health rules moved into the engine as pure functions. `storage.ts` 707 -> 445 lines; both surfaces call the same `tick` / `applyCare`. Numbers ported unchanged and pinned by `engine.test.ts`. Mother and phone typecheck and build. **Not yet exercised in a browser.**
- [x] T3 `mergeHaggling` + 11 property/scenario tests (idempotent, newer block wins whole, cloud wins ties, scrapbook union, weather slots union, traits from cloud, cleared transfer code not resurrected, bad timestamps)
- [ ] T4 Migration `20261116_sync_conflict.sql`: new columns, immutable-traits trigger, stale-write guard (R2, R6)
- [ ] T5 `cloud.ts`: push full meter block + `updated_at`; pull maps `health_xp`, `engine_state`; scrapbook upsert by id; pull merges instead of `replaceLocalBrood` (R2, R4, R5)
- [ ] T6 Test: phone offline care, mother care, reconnect: result follows R3, nothing lost from scrapbook
- [ ] T7 Regenerate `schema.sql` from migrations; add `scripts/check-schema.sh` and CI workflow (R7)
- [ ] T8 Hook `schema-regen-reminder` on `supabase/migrations/*.sql`
- [ ] T9 Update `brood-sync/tasks.md` R2.3 / R4.2 to ticked

Legend: [x] verified, [ ] not started.
Tests: `npm test` at the repo root (27 passing on 16 Nov 2026).
