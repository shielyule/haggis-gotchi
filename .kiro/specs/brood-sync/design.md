# Kiro - Design: brood-sync (reconciled 16 Nov 2026)

## Current architecture (as built)

```
 Mother  haggisgotchi.com/        brood list, claim, retrieve     (apps/mother)
 Nest    haggisgotchi.com/{slug}  wait, hatch, name, care         (apps/mother NestApp)
 Phone   phone.haggisgotchi.com   claim code, care                (apps/phone, imports ../mother/src)
              |                      |
              +---- localStorage ----+   (haggis-gotchi:v1, haggis-gotchi:phone:v1)
              |
          Supabase: auth (email OTP) + Postgres (RLS) + Edge Functions
              |
          Resend: egg-ready email (cron)
```

## Data model (Postgres)

`carers` 1-1 `auth.users`. `eggs` (carer_id nullable until OTP, email, ready_code_sent_at).
`children` (egg_id unique, meters, schedule hours, living_on, transfer_code, transfer_expires_at).
`scrapbook_entries`, `check_ins` (surface: mother | phone | pi).
Functions: `register_egg` (anon), `claim_my_eggs_by_email` (authenticated), `handle_new_user` trigger.

Columns added by later specs: `health_xp`, `sick`, `engine_state` (sync-conflict);
`born_at`, `span_ends_at`, `departed_at`, `ghost_opt_in` (lifespan-graveyard);
`weather_readings` table (weather-mood).

## Flow

1. Claim -> `claimEggSynced`: local egg + `register_egg` RPC (works before login so cron can email).
2. Ready -> cron `notify-ready-eggs` emails nest link.
3. Name -> `nameHagglingSynced` creates `children` row.
4. Send to phone -> `mintPhoneTransferSynced` sets transfer code.
5. Phone claim -> `claimChildByTransferCode` (signed in, owner-matched).
6. Care -> `*ActionSynced` mutates local, then `pushCheckIn`.

## Known issues (tracked in other specs)

- Local vault `haggis-gotchi:transfers:v1` and full-packet links duplicate the cloud claim: security-hardening removes them.
- `pushCheckIn` overwrites; pull replaces local brood: sync-conflict.
- Phone imports mother source by relative path: acceptable until the shared care engine (sync-conflict) moves logic to `packages/care-engine`.

## Parked: Pi surface
`check_ins.surface` already allows `pi`. No Pi code in this repo for Kiroween.
