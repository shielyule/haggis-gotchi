# Kiro - Requirements: sync-conflict

Status: DRAFT for approval (16 Nov 2026). Fixes gaps 5-8 in `GAP-LIST.md`.

## Overview
Phone, nest and mother may all change the same Haggling, sometimes offline.
When they meet, the result must be predictable, lose nothing the carer did, and
never create a second pet. All care rules live in one shared engine.

## Requirements (EARS)

### R1 One care engine
1. THE SYSTEM SHALL implement meter decay, schedule penalties, Health XP and care actions in exactly one module (`packages/care-engine`) used by nest, phone and (later) any Edge Function.
2. WHEN decay or penalty numbers change, THEN a single edit SHALL change them on every surface.

### R2 Everything that matters is synced
1. THE SYSTEM SHALL persist and sync: hunger, mood, energy, mess, Health XP, sick flag, penalty clocks and flags, last clean, last tick, applied weather slots.
2. WHEN a brood is pulled from the cloud, THEN Health XP and penalty state SHALL equal what was last pushed (not a default).

### R3 Latest timestamp wins (meters)
1. Each Haggling snapshot SHALL carry `updated_at` (the engine's `lastTickAt`) set by the surface that produced it.
2. WHEN two snapshots meet, THE SYSTEM SHALL keep the whole **meter set** from the snapshot with the later `updated_at`.
3. IF `updated_at` is equal, THEN the mother (cloud) snapshot SHALL win.
4. THE SYSTEM SHALL merge the meter set as one unit, never field by field.

### R4 Append-only memories
1. THE SYSTEM SHALL merge scrapbook entries as a **union by entry id**, sorted by time. It SHALL NOT delete-and-reinsert the scrapbook.
2. THE SYSTEM SHALL keep `check_ins` append-only.
3. THE SYSTEM SHALL merge applied weather slots as a set union (a slot is never applied twice).

### R5 Pull does not clobber
1. WHEN pulling the cloud brood, THE SYSTEM SHALL merge with local state using R3-R4 rather than replace it.
2. WHEN the cloud pull fails, THE SYSTEM SHALL keep local state unchanged.

### R6 Traits are immutable
1. THE SYSTEM SHALL reject (in the database) updates to `egg_id`, `carer_id`, `temperament_id`, `born_at` after hatch.
2. IF a client attempts it, THEN the update SHALL fail and local state SHALL be left as-is.

### R7 Schema discipline
1. THE SYSTEM SHALL keep every database change as a numbered file in `supabase/migrations/`.
2. `supabase/schema.sql` SHALL be generated from the migrations, not hand-edited.
3. WHEN a pull request changes migrations or schema, a check SHALL fail if `schema.sql` is not regenerated.

## Non-goals
Realtime push, CRDTs, per-field merge, a server-side game loop.
