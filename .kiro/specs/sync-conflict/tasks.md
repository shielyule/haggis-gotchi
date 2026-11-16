# Kiro - Tasks: sync-conflict

Run in this order. Commit message format: `sync-conflict T3: <what>`.

- [ ] T1 Create `packages/care-engine` with types and rules; add Vite alias + tsconfig paths in mother and phone
- [ ] T2 Move `tick`, care actions and `health.ts` into the engine as pure functions; mother and phone both call them; delete `tickPhoneChild`/`carePhoneAction` copies (R1)
- [ ] T3 Implement `mergeHaggling` and property tests for the six properties in design 3 (R3, R4)
- [ ] T4 Migration `20261116_sync_conflict.sql`: new columns, immutable-traits trigger, stale-write guard (R2, R6)
- [ ] T5 `cloud.ts`: push full meter block + `updated_at`; pull maps `health_xp`, `engine_state`; scrapbook upsert by id; pull merges instead of `replaceLocalBrood` (R2, R4, R5)
- [ ] T6 Test: phone offline care, mother care, reconnect: result follows R3, nothing lost from scrapbook
- [ ] T7 Regenerate `schema.sql` from migrations; add `scripts/check-schema.sh` and CI workflow (R7)
- [ ] T8 Hook `schema-regen-reminder` on `supabase/migrations/*.sql`
- [ ] T9 Update `brood-sync/tasks.md` R2.3 / R4.2 to ticked
