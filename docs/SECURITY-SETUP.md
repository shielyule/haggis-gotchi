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

---

## B. Close the row-security gap (T6) and prove it (T1)

1. SQL Editor -> paste `supabase/migrations/20261116_eggs_policies_with_check.sql` -> Run.
2. SQL Editor -> paste `supabase/tests/rls_isolation.sql` -> Run.
   Expected message: `RLS isolation: all checks passed`. It rolls back, so it leaves nothing behind.
3. If it prints `FAIL n`, paste me the line. That is the attack working, and we fix it.

These SQL files were written without being run (I cannot reach your database). Treat the first run as the real test.

---

## C. Cloudflare Turnstile (bot check for claiming an egg) - T4 prep, about 5 minutes

You already use Cloudflare, so no new account.

1. Cloudflare dashboard -> **Turnstile** (left menu) -> **Add widget**.
2. Name: `haggis-claim`. Hostnames: `haggisgotchi.com` and `localhost`. Widget mode: **Managed**. Create.
3. You get two keys:
   - **Site key** (public). Put in `apps/mother/.env.local` as `VITE_TURNSTILE_SITE_KEY=...` and as an environment variable in Cloudflare Pages (mother project).
   - **Secret key** (private). Only here: `supabase secrets set TURNSTILE_SECRET=...`
4. Tell me when done. Never send me the secret key. The site key is safe to share.

For local development Cloudflare publishes always-pass test keys, so the form works
offline. I will confirm the exact values from their docs when I build T4.

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

1. A and B above (you).
2. `security-hardening` T4-T5, T7, T9 (claim-egg function, claim codes, headers).
3. `sync-conflict` T4-T9 (database columns, cloud merge wiring, schema CI).
4. `weather-mood`, then `lifespan-graveyard` (span length still to be agreed).
