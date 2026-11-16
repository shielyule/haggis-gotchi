# Kiro - Tasks: security-hardening

Commit format: `security-hardening T2: <what>`. Highest risk first.

- [~] T1 RLS test written: `supabase/tests/rls_isolation.sql`. NOT YET RUN. Record result here (R6.2)
- [x] T2 Escape email HTML + strict slug + display-name allow-list, atomic send claim, per-address cap, no emails in responses. 9 unit tests pass (`supabase/functions/_shared/shared.test.ts`). Found by test: escaping alone still lets mail apps auto-link attacker text, so the name is also restricted to letters/numbers/space/apostrophe/hyphen. **Deploy pending (SECURITY-SETUP A4).**
- [~] T3 Code done: `x-cron-secret` check fails closed, constant-time compare, no CORS. Migration `20261116_cron_via_vault.sql` written. **Waiting on you: SECURITY-SETUP A1-A7** (secret, deploy, reschedule, rotate service key)
- [ ] T4 Edge Function `claim-egg`: Turnstile, validation, rate limits, `claim_attempts`; revoke anon on `register_egg`; strip email from `answers` (R1, R4)
- [ ] T5 Phone handoff: expiry check, clear on use, uniform error, 5-per-15-min lock; delete packet links and local vault (R5)
- [~] T6 Migration `20261116_eggs_policies_with_check.sql` written (with check + protected columns trigger). NOT YET APPLIED (SECURITY-SETUP B)
- [ ] T7 `_headers` for mother and phone; test with securityheaders.com (R7.2)
- [ ] T8 Steering `security.md` (done 16 Nov) and hook `secret-guard` (R7.1)
- [ ] T9 `npm audit` in CI (R7.3)
- [ ] T10 (stretch) plausibility trigger: reject meter jumps larger than one care action allows

Legend: [x] verified, [~] written but needs a step from the owner, [ ] not started.
