# Kiro - Tasks: security-hardening

Commit format: `security-hardening T2: <what>`. Highest risk first.

- [x] T1 RLS test run 16 Nov: `RLS isolation` passed (no FAIL). Applied via CLI; rolled back clean (no leftover test users/eggs).
- [x] T2 Escape email HTML + strict slug + display-name allow-list, atomic send claim, per-address cap, no emails in responses. 9 unit tests pass. Deployed; ready email `outcome: sent` verified.
- [x] T3 Cron locked: `x-cron-secret`, Vault synced, grants restored (`20261116_restore_table_grants.sql`), deploy live, manual + path verified.
- [~] T4 `claim-egg` LIVE (16 Nov): validation (allow-list, lengths, enums), Turnstile server check, rate limits (3/email/day, 10/IP/hour), server sets `ready_at`, email only in `eggs.email`, duplicate id refused. Verified live by curl: no token 403, bad email 400, unknown key 400, GET 405, valid 200, same id 409, 4th claim 429. `claim_attempts` + future-table grant tightening applied (`20261116200000`). Client uses it. Phase 2 APPLIED 16 Nov after push: `register_egg` closed to anon/authenticated, email stripped. **Waiting:** live Turnstile site key + redeploy (GO-LIVE Part 1), browser test (Part 4). Turnstile uses Cloudflare test keys until a real widget is made.
- [~] T5 Server functions LIVE: `mint_transfer_code`, `claim_child_by_code` (owner only, unexpired, single use, uniform message, 5 tries per 15 min), `return_child_to_nest`. 14 SQL checks pass (`supabase/tests/handoff_phase1.sql`). Client: packet links, local code vault and `api.qrserver.com` removed; QR drawn in the browser; nest goes read-only while on the phone; Twilio button hidden. Phase 2 trigger APPLIED 16 Nov (browser cannot set `living_on`/codes). Test data wiped (backup in `backups/`, git-ignored). **Waiting:** phone site serves the wrong app (GO-LIVE Part 1b), then browser test (Part 4).
- [x] T6 Migration `20261116_eggs_policies_with_check.sql` applied (WITH CHECK + protect-columns trigger). Verified on live DB.
- [ ] T7 `_headers` for mother and phone; test with securityheaders.com (R7.2)
- [ ] T8 Steering `security.md` (done 16 Nov) and hook `secret-guard` (R7.1)
- [ ] T9 `npm audit` in CI (R7.3)
- [ ] T10 (stretch) plausibility trigger: reject meter jumps larger than one care action allows

Legend: [x] verified, [~] written but needs a step from the owner, [ ] not started.
