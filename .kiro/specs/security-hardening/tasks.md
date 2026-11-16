# Kiro - Tasks: security-hardening

Commit format: `security-hardening T2: <what>`. Highest risk first.

- [x] T1 RLS test run 16 Nov: `RLS isolation` passed (no FAIL). Applied via CLI; rolled back clean (no leftover test users/eggs).
- [x] T2 Escape email HTML + strict slug + display-name allow-list, atomic send claim, per-address cap, no emails in responses. 9 unit tests pass. Deployed; ready email `outcome: sent` verified.
- [x] T3 Cron locked: `x-cron-secret`, Vault synced, grants restored (`20261116_restore_table_grants.sql`), deploy live, manual + path verified.
- [ ] T4 Edge Function `claim-egg`: Turnstile, validation, rate limits, `claim_attempts`; revoke anon on `register_egg`; strip email from `answers` (R1, R4)
- [ ] T5 Phone handoff: expiry check, clear on use, uniform error, 5-per-15-min lock; delete packet links and local vault (R5)
- [x] T6 Migration `20261116_eggs_policies_with_check.sql` applied (WITH CHECK + protect-columns trigger). Verified on live DB.
- [ ] T7 `_headers` for mother and phone; test with securityheaders.com (R7.2)
- [ ] T8 Steering `security.md` (done 16 Nov) and hook `secret-guard` (R7.1)
- [ ] T9 `npm audit` in CI (R7.3)
- [ ] T10 (stretch) plausibility trigger: reject meter jumps larger than one care action allows

Legend: [x] verified, [~] written but needs a step from the owner, [ ] not started.
