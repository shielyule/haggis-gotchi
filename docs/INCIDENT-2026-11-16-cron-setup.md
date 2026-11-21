# Kiro - Incident: cron security setup failed, about 2 hours lost (16 Nov 2026)

Recorded at the owner's request, for the Kiroween write-up. Written by Kiro about Kiro's own mistake.

## What happened

Kiro wrote `docs/SECURITY-SETUP.md` section A: lock the `notify-ready-eggs` cron
function with a secret, move the secret into Supabase Vault, reschedule the job.
The owner followed it. The function returned `500 Server not configured`, then
the cron job kept failing. Kiro's two follow-up replies guessed at causes and
asked the owner to run diagnostic SQL. Neither fixed it. The owner brought in
Grok (Cursor), which fixed it in a separate session.

## What was actually wrong (from the fix that worked)

1. **Table grants missing.** Supabase changed its platform default on 30 Oct 2026:
   existing projects stop getting automatic grants for the Data API. The project's
   tables had lost their select/insert/update/delete grants. Every query from the
   Edge Function failed with `permission denied for table eggs`. Grok added
   `supabase/migrations/20261116000003_restore_table_grants.sql`.
2. **Vault secret did not match** the function's `CRON_SECRET`.
3. **`RESEND_API_KEY` was not set** on the function.

## Kiro's mistakes

| # | Mistake | Should have done |
| --- | --- | --- |
| 1 | Wrote setup steps for a hosted platform without checking its recent changes. The date was after the 30 Oct Supabase change. | Searched the Supabase changelog before writing any database or API step. |
| 2 | Steps had no "you should see" result and no "if not, do this". | One action per step, an expected result, and an exact next step on failure. |
| 3 | Called the steps "about 10 minutes" without having run any of them. | Labelled every step "untested" and given no time estimate. |
| 4 | No pre-flight check. Missing secrets and grants were discoverable before deploy. | Run a pre-flight (secret names, grants, Vault names) first, ideally by Kiro itself through the linked Supabase CLI, with permission. |
| 5 | The first function version logged only "missing server configuration", not which setting was missing. | Named the missing setting from the start. |
| 6 | After the failure, sent a second round of guesses and raw SQL against cron internals, after the owner had asked for dummies-level instructions. | Asked for one log line, then given one step at a time. |

## Impact

About 2 hours of the owner's time. A second tool was needed to finish the work.
No data was lost and no secret leaked. The end state is verified working:
ready email delivered, cron authenticated (`security-hardening` T2, T3 ticked by the owner).

## What changes

- New always-on steering file `.kiro/steering/owner-instructions.md` with the rules above. Kiro does not remember past sessions, so the lesson has to live in steering to apply next time.
- Instructions for the owner are written to that standard from now on.
- Where the Supabase CLI is linked on this machine, Kiro offers to run checks itself and show the output, instead of handing the owner commands.

## Follow-up found while reviewing the fix (not yet changed)

`20261116000003_restore_table_grants.sql` restores the old broad defaults, including
`alter default privileges ... grant all on tables to anon, authenticated`. That
undoes the protection Supabase just added: every future table becomes reachable
by anyone with the public key unless RLS is enabled on it. The current tables all
have RLS, so nothing is exposed today. Supabase's guidance is to grant each role
only what it needs, in the same migration as the RLS policy. Fixed 16 Nov in
`20261116200000_claim_egg_and_handoff.sql`: future tables no longer get API
grants automatically. Existing tables and Grok's file are unchanged.
