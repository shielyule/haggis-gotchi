# Kiro - Requirements: security-hardening

Status: DRAFT for approval (16 Nov 2026). Fixes gaps 9-11 in `GAP-LIST.md`.
Standing rule: `.kiro/steering/security.md` applies to every future spec.

## Threats found in the current code

| # | Threat | How it works today |
| --- | --- | --- |
| A | Email abuse | `register_egg` is callable by anyone with the public anon key. The cron then emails whatever address is on the row. An attacker can make us send mail to strangers from `hello@haggisgotchi.com`. |
| B | Phishing via our own email | `notify-ready-eggs` puts the display name straight into HTML and builds the nest link from the unsanitised `slug` in `answers`. An attacker controls both. |
| C | Open cron endpoint | `notify-ready-eggs` does no caller check beyond Supabase's default JWT gate, which the public anon key passes. |
| D | Claim link leaks personal data | Legacy "full packet" link base64-encodes the whole egg (including email) into a URL. |
| E | Claim code never expires | `transfer_expires_at` is written, never read. Code is not cleared after use. |
| F | Row policy gap | `eggs_update_own` has no `with check`; a matching user could update columns such as `carer_id`. To be proven by test before fixing. |
| G | Duplicate PII | Email stored in both `eggs.email` and `eggs.answers`. |
| H | Secrets in repo | None tracked (checked). Nothing stops a future commit. |

## Requirements (EARS)

### R1 Claim an egg safely
1. WHEN an egg is claimed, THE SYSTEM SHALL pass a bot check (Cloudflare Turnstile) verified server-side.
2. THE SYSTEM SHALL create eggs only through an Edge Function `claim-egg`; `register_egg` SHALL NOT be executable by `anon`.
3. THE SYSTEM SHALL validate: email format and length <= 254, display name length <= 40, answers <= 4 KB, only known keys, `chaos` integer 0-100, enumerated fields only from allowed values.
4. THE SYSTEM SHALL limit claims to 3 per email per 24h and 10 per IP per hour; excess SHALL get HTTP 429.

### R2 Email we send is safe
1. THE SYSTEM SHALL HTML-escape every user-supplied value placed in an email.
2. THE SYSTEM SHALL build the nest URL only from a slug that matches `^[a-z0-9-]{1,40}$` and fall back to a generated slug otherwise.
3. THE SYSTEM SHALL send at most one ready email per egg and at most 3 per address per 24h.
4. THE SYSTEM SHALL include "if you did not request this, ignore this" text.

### R3 Cron endpoint is private
1. `notify-ready-eggs` SHALL require a secret header (`x-cron-secret`) matching an Edge Function secret, and respond 401 otherwise.
2. THE SYSTEM SHALL log only egg ids, never email addresses.

### R4 Data minimisation
1. THE SYSTEM SHALL store the email only in `eggs.email`, and strip it from `answers`.
2. THE SYSTEM SHALL NOT put personal data in any URL.

### R5 Phone handoff
1. THE SYSTEM SHALL remove the full-packet link path and the localStorage transfer vault.
2. THE SYSTEM SHALL accept a claim code only if unexpired (7 days), owned by the signed-in carer, and SHALL clear it after use.
3. IF the code is wrong, expired, or not owned, THEN THE SYSTEM SHALL return the same message for all three cases.
4. THE SYSTEM SHALL limit failed attempts to 5 per carer per 15 minutes.

### R6 Row policies
1. THE SYSTEM SHALL add `with check` to every update policy so `carer_id` and `email` cannot be reassigned.
2. A test SHALL prove user A cannot read, update or delete user B's egg, child, scrapbook or check-ins.

### R7 Repo and delivery
1. A hook SHALL block writes containing key-shaped strings (JWT, `sk_`, `re_`, service role values).
2. Cloudflare Pages SHALL serve security headers: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` limiting geolocation to self.
3. `npm audit` SHALL run in CI and fail on high severity.
4. THE SYSTEM SHALL keep `.env.local` and `supabase/.temp/` out of git.

## Non-goals
Penetration test by a third party, SOC 2, anti-cheat on meters (low stakes; a plausibility trigger is a stretch task).
