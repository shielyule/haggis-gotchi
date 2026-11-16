# Kiro - Tasks: security-hardening

Commit format: `security-hardening T2: <what>`. Highest risk first.

- [ ] T1 RLS test harness (two users) that proves threat F; record result in this file (R6.2)
- [ ] T2 Escape email HTML + safe slug in `notify-ready-eggs`; unit tests with `<script>`, `"><a href>`, `../` inputs (R2.1-2.2)
- [ ] T3 Require `x-cron-secret` on `notify-ready-eggs`; move secret to Vault; update cron job (R3)
- [ ] T4 Edge Function `claim-egg`: Turnstile, validation, rate limits, `claim_attempts`; revoke anon on `register_egg`; strip email from `answers` (R1, R4)
- [ ] T5 Phone handoff: expiry check, clear on use, uniform error, 5-per-15-min lock; delete packet links and local vault (R5)
- [ ] T6 Migration: `with check` on policies (R6.1)
- [ ] T7 `_headers` for mother and phone; test with securityheaders.com (R7.2)
- [ ] T8 Steering `security.md` (done 16 Nov) and hook `secret-guard` (R7.1)
- [ ] T9 `npm audit` in CI (R7.3)
- [ ] T10 (stretch) plausibility trigger: reject meter jumps larger than one care action allows
