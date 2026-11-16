# Kiro - Requirements: brood-sync (reconciled 16 Nov 2026)

Reconciled against the code in `apps/mother`, `apps/phone` and `supabase/`.
Supersedes the day-one version (which assumed localStorage only).

## Overview

One Haggling, many surfaces, never a twin. The cloud **mother** (Supabase) holds
the brood record. The **nest** (`haggisgotchi.com/{slug}`) and the **phone**
(`phone.haggisgotchi.com`) are surfaces where care happens. The Pi is parked.

Conflict and merge rules live in `sync-conflict`. Lifespan lives in
`lifespan-graveyard`. This spec covers identity, hatch and surface handoff.

## Requirements (EARS)

### R1 Identity
1. THE SYSTEM SHALL issue exactly one `children.id` per `eggs.id` (`egg_id` is unique).
2. WHEN a surface adopts a Haggling, THE SYSTEM SHALL reuse that `children.id`; it SHALL NOT create a second child.
3. THE SYSTEM SHALL bind each egg and child to one carer (`carer_id`) and enforce it with row level security.

### R2 Hatch
1. WHEN an egg's `ready_at` has passed, THE SYSTEM SHALL set status `ready` and allow naming.
2. WHEN the carer names the Haggling, THE SYSTEM SHALL create the child with temperament (from chaos), meal and bed hours, and starting meters, and set the egg `hatched`.
3. Traits (temperament, egg id, birth story id) SHALL NOT change after hatch (enforced in `sync-conflict`).

### R3 Send to phone
1. WHEN the carer chooses Send to phone, THE SYSTEM SHALL mint a 6-character claim code, store it on the child with a 7-day expiry, and set `living_on = 'phone'` when claimed.
2. WHEN the phone presents a valid, unexpired code for a signed-in carer who owns the child, THE SYSTEM SHALL load that same child.
3. IF the code is wrong, expired, or belongs to another carer, THEN THE SYSTEM SHALL refuse with the same message in all three cases (no enumeration).
4. THE SYSTEM SHALL clear the code once claimed (expiry and single-use enforced in `security-hardening`).

### R4 Check-in
1. WHEN a care action happens on a signed-in surface, THE SYSTEM SHALL write a `check_ins` row and update the child's meters.
2. WHILE offline, a surface SHALL keep decaying meters from its local clock and reconcile on reconnect (rules in `sync-conflict`).

### R5 Brood view
1. THE mother `/` SHALL list only Hagglings with `living_on = 'mother'` and open each in a new tab at `/{slug}`.
2. THE mother `/` SHALL NOT render the care screen.
3. WHEN a carer signs in, THE SYSTEM SHALL pull their brood and attach eggs registered under the same email.

## Non-goals
Realtime websockets, multiplayer, dating, wallets, Pi pairing (parked for later), paid SMS.
