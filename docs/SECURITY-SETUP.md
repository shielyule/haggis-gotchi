# Kiro - Security setup crib sheet (things only you can do)

Written 16 Nov 2026. Code for these is committed; these steps connect it to your
live Supabase and Cloudflare. Do them in order. Never paste a secret into chat,
a spec, a commit or a URL.

Project ref used below: replace `<project-ref>` with yours (Supabase dashboard URL).

---

## A. Lock the cron function (security-hardening T3) - about 10 minutes

Why: the function is currently deployed with no authentication, so anyone can call
it. And the cron job has your **service-role key** pasted into its SQL, which sits
in plain text inside the database.

**A1. Make a long random secret** (Terminal, copy the output):

```bash
openssl rand -base64 48 | tr -d '/+=' | head -c 48; echo
```

**A2. Store it in Supabase Vault** (SQL Editor -> New query -> replace the two values -> Run):

```sql
select vault.create_secret('PASTE_THE_RANDOM_STRING', 'cron_secret');
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'functions_base_url');
```

**A3. Give the same string to the function** (Terminal, in the repo folder):

```bash
supabase secrets set CRON_SECRET=PASTE_THE_RANDOM_STRING
```

**A4. Deploy the new function** (keep `--no-verify-jwt`: the function now checks the secret itself):

```bash
supabase functions deploy notify-ready-eggs --no-verify-jwt
```

**A5. Re-schedule the job without the service key.** SQL Editor -> New query ->
paste the whole of `supabase/migrations/20261116_cron_via_vault.sql` -> Run.

**A6. Test it:**

```bash
# must say 401 Unauthorized
curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/notify-ready-eggs"

# must say 200 and {"checked":N,...}
curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/notify-ready-eggs" \
  -H "x-cron-secret: PASTE_THE_RANDOM_STRING"
```

**If A6 returns 500 `Server not configured`:** the secret check passed (good), but one
server setting is missing. Run `supabase secrets list` and look for the names
`RESEND_API_KEY`, `READY_EMAIL_FROM`, `SITE_URL`, `CRON_SECRET`. Any that are absent:
`supabase secrets set NAME=value`. Then redeploy (A4) and open Supabase -> Edge
Functions -> notify-ready-eggs -> Logs: the line `missing server configuration: <names>`
says exactly which one. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are normally
provided automatically. Do not set them by hand unless the log names them.

**A7. Rotate the service-role key** (it has lived in cron SQL and your notes):
Supabase -> Project Settings -> API Keys -> Secret keys -> regenerate `default`.
Edge Functions get the new value automatically. Delete any copy in Notes.
Also delete the old step 3 key paste from `Kiroween/SMTP-DUMMIES.md` history if you kept it.

**A8. Tell me "A done"** and I will tick T3 in `tasks.md`.

**If curl returns 500 with Logs saying `permission denied for table eggs`:**
table grants were stripped. In SQL Editor run all of
`supabase/migrations/20261116_restore_table_grants.sql`, then re-curl.
(RLS still applies; this only restores normal SELECT/INSERT/UPDATE/DELETE.)

---

## B. Close the row-security gap (T6) and prove it (T1) — DONE 16 Nov

Applied on live project via CLI:
1. `20261116_eggs_policies_with_check.sql` — `eggs_update_own` now has `WITH CHECK (auth.uid() = carer_id)` + protect-columns trigger.
2. `rls_isolation.sql` — ran clean (no `FAIL n`), rolled back, no leftover test rows.

Do not re-run unless policies are changed again.

---

## C. Cloudflare Turnstile (bot check for claiming an egg) - T4 prep

**Local / T4 coding (done 16 Nov):** Cloudflare always-pass test keys are wired so Kiro can build T4 without a dashboard login:
- `apps/mother/.env.local` → `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA`
- Supabase secret `TURNSTILE_SECRET` → always-pass test secret

**Before go-live (you, ~5 min — needs Cloudflare login):**
1. dash.cloudflare.com → **Turnstile** → **Add widget**
2. Name `haggis-claim`. Hostnames: `haggisgotchi.com`, `localhost`. Mode **Managed**.
3. Put the real **site key** in Cloudflare Pages (mother) as `VITE_TURNSTILE_SITE_KEY` and in `.env.local`.
4. `supabase secrets set TURNSTILE_SECRET=<real secret>` (replace the test secret).

---

## D. Open-Meteo (weather)

No account, no API key, nothing to sign up for. It is free for non-commercial use.
If you later sell skins or merch it becomes commercial use and needs a paid plan
(see open-meteo.com/en/pricing). The code will sit behind one adapter file so the
provider can be swapped.

---

## E. Open the product repo in Kiro (so hooks fire there)

1. Kiro -> **File -> Open Folder...** -> `/Users/shielyule/Desktop/haggis-gotchi-app`.
2. Start a **new chat/session** there (hooks load at session start).
3. Optional: **File -> Add Folder to Workspace...** -> `Desktop/Kiroween`, so notes stay readable. Hooks and specs belong to the product folder only.
4. First message to paste: *"Read .kiro/specs/GAP-LIST.md and docs/PROVENANCE.md, then continue from the first unticked task in .kiro/specs/security-hardening/tasks.md."*

---

## F. Order of work from here

1. ~~A and B~~ **done**.
2. In **Kiro** (section E): continue `security-hardening` from T4 (claim-egg + Turnstile).
3. Then T5, T7, T9; then `sync-conflict` T4–T9.
4. `weather-mood`, then `lifespan-graveyard` (span length still to be agreed).
5. Before public launch: replace Turnstile **test** keys with a real widget (section C go-live).
