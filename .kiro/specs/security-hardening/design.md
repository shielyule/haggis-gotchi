# Kiro - Design: security-hardening

## Principle
The browser is untrusted. The anon key is public by design, so it protects
nothing; row level security, validation and the Edge Functions do the protecting.

## 1. Claim path

```
Browser  --(form + Turnstile token)-->  Edge Function claim-egg
                                           1 verify Turnstile token with Cloudflare
                                           2 validate + normalise input (allow-list)
                                           3 rate limit (per email, per IP) using table claim_attempts
                                           4 insert egg with service role
                                        <-- { id, readyAt }
```
- `revoke execute on function register_egg from anon, authenticated`.
- `claim_attempts(id, email_hash, ip_hash, at)`; store hashes, not raw values; purge after 48h.
- Validation is a plain function with unit tests: bad email, long name, extra keys, chaos 101, `place` not in enum, answers over 4 KB.

## 2. Ready email

- `escapeHtml()` on name, quirk and anything else interpolated.
- `safeSlug(slug, name)`: regex check, else `slugifyName(name)`, else `carer`.
- Cron call requires `x-cron-secret`. pg_cron job passes it from Vault, not from SQL text.
- Idempotent send: set `ready_code_sent_at` before sending in a transaction, so retries cannot double-send.

## 3. Phone handoff

Keep only: signed-in carer + 6-char code + expiry.
- Code space: 32^6 ~ 1.07 billion, useless without being signed in as the owner.
- Add table `claim_failures` or reuse `claim_attempts` for the 5 per 15 minute lock.
- On success: `transfer_code = null`, `transfer_expires_at = null`.
- Delete `encodeTransferPacket`, `decodeTransferPacket`, `mintPhoneTransfer` vault, `claimOnPhone` local path and the "paste full link" UI copy.

QR and share link carry only the short code in the hash: `phone.haggisgotchi.com/#/c/BRAW7K`.
The phone still requires sign-in.

## 4. Row policies (SQL sketch)

```sql
create policy eggs_update_own on public.eggs for update
  using (auth.uid() = carer_id or lower(email) = lower(coalesce(auth.jwt()->>'email','')))
  with check (auth.uid() = carer_id);   -- cannot hand an egg to someone else
```
Insert only via `claim-egg` (service role) and `claim_my_eggs_by_email`.
RLS tests: two seeded users, assert every cross-user read/update/delete returns 0 rows.

## 5. Headers and CSP (`apps/*/public/_headers`)

```
/*
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; media-src 'self';
    connect-src 'self' https://<project>.supabase.co https://api.open-meteo.com https://challenges.cloudflare.com;
    frame-src https://challenges.cloudflare.com; script-src 'self' https://challenges.cloudflare.com
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(self), camera=(self), microphone=()
```

## 6. Guardrails inside Kiro

- Steering `security.md` (always included): rules every spec must follow.
- Hook `secret-guard` (PreToolUse on write tools): blocks key-shaped strings.
- Every new spec's requirements must include a "Security considerations" section.

## Open decision
Turnstile adds a third party. Alternative: email-verify-before-send (egg waits until the carer enters a code). Safer for the email-abuse threat but breaks the "closed browser" cron flow, so Turnstile is the recommendation.
