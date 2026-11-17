# Kiro - Tasks: care-reminders

- [~] T1 Generate VAPID keys; secrets set; public key in app — keys generated 17 Nov; private key only in Supabase secrets
- [~] T2 Migration: `push_subscriptions`, `reminder_log`, grants + RLS; test in rollback — applied live; covered by the phone-home SQL test
- [~] T3 `reminders.ts` pure decision functions + tests — 6 tests pass
- [~] T4 Edge Function `care-reminders` + cron schedule; `notify-ready-eggs` skip — deployed; cron every 15 min; live run 200 {carers:0}; ready email skips carers with reminders
- [~] T5 Service worker + "Turn on reminders" button — built
- [ ] T6 Android test (owner): real notification arrives

Legend: [x] verified on a phone, [~] built and server-tested, phone test pending, [ ] not started.
