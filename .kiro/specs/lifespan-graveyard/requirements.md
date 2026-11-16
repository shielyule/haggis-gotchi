# Kiro - Requirements: lifespan-graveyard

Status: DRAFT for approval (16 Nov 2026). Fixes gap 4 in `GAP-LIST.md`.

## Overview
A Haggling has a fixed lifespan. When it ends, the mother keeps a scrapbook and a
graveyard entry. Neglect darkens the story but never causes early death. A carer
may keep a read-only ghost.

## Requirements (EARS)

### R1 Fixed lifespan
1. WHEN a Haggling is named (hatched), THE SYSTEM SHALL record `born_at` and `span_ends_at = born_at + span` on the server.
2. THE span SHALL be a single configuration value (`LIFESPAN`), with a demo value of a few minutes. **OPEN DECISION (16 Nov):** 14 days was rejected as too short. The product vision is ~6 months with life stages (Baby, Child, Teen with optional gender morphing, Young Adult, Adult). Decide: full length, or a condensed span with compressed stages. Do not build until agreed.
3. `born_at` and `span_ends_at` SHALL be immutable after hatch.
4. THE nest and phone SHALL show time remaining from the last sync plus local elapsed time.

### R2 Departure
1. WHEN now >= `span_ends_at`, THE SYSTEM SHALL set `departed_at` once and disable care actions.
2. WHEN no surface is open at that time, THE SYSTEM SHALL still depart the Haggling (scheduled job), so the result is the same.
3. THE departure SHALL write a final scrapbook page and one graveyard entry (unique per child).
4. THE SYSTEM SHALL NOT end a life early for any reason.

### R3 Neglect without death
1. THE SYSTEM SHALL keep a rolling daily mood average and derive a tone: `bright` (>= 60), `dim` (35-59), `dark` (< 35).
2. WHILE tone is `dim` or `dark`, THE SYSTEM SHALL use darker scrapbook wording, a darker nest background, and a matching epitaph.
3. WHEN care improves, tone SHALL recover within 2 days.

### R4 Graveyard
1. THE mother SHALL show a graveyard of the signed-in carer's departed Hagglings: name, temperament, days lived, tone, epitaph, final scrapbook.
2. THE graveyard SHALL be visible only to the owning carer.

### R5 Ghost (read-only)
1. WHEN a Haggling departs, THE SYSTEM SHALL ask the carer once whether to keep a ghost.
2. WHERE a ghost is kept, THE SYSTEM SHALL show a faded portrait with the last 5 scrapbook lines.
3. A ghost SHALL NOT have meters, care actions or notifications.

## Security considerations
Graveyard rows protected by RLS (carer_id). Departure is done by the database/Edge Function, not trusted from the client, so a client cannot extend or shorten life.

## Non-goals
Rebirth, inheritance, dating, ghost behaviours, early death, paid resurrection.
