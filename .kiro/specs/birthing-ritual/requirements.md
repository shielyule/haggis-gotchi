# Kiro - Requirements: birthing-ritual (reconciled 16 Nov 2026)

## Overview
Claiming an egg starts a ~30 minute birth wait with a templated story. Templates
come first; AI may only elaborate within a chosen template (not built yet).

## Requirements (EARS)

### R1 Signup
1. THE SYSTEM SHALL collect: display name, email, pet, home (city/town/countryside/seaside), games, comfort food, perfect day (rainy/beach/forest), family quirk, chaos 0-100, teen opt-in with disclaimer acknowledgement.
2. WHEN the carer submits, THE SYSTEM SHALL create the egg with `ready_at = now + wait` and store answers on it.
3. THE SYSTEM SHALL derive a URL slug from the display name (`/{slug}`).

### R2 Wait
1. WHILE the egg is waiting, THE SYSTEM SHALL show the picked story's three beats in order across the wait.
2. WHERE demo mode is on, THE SYSTEM SHALL compress the wait to 90 seconds.
3. WHEN `ready_at` passes, THE SYSTEM SHALL mark the egg ready and play the hatch film for the temperament.
4. WHEN the browser is closed at ready time, THE SYSTEM SHALL email the nest link (see `nest-and-ready`).

### R3 Templates
1. THE SYSTEM SHALL hold 20 story skeletons, tagged by chaos band, with `{{slots}}` filled from answers.
2. THE SYSTEM SHALL pick a story by temperament band first.
3. IF AI elaboration is added, THEN it SHALL change wording only, not temperament, species, facts or add quests; failure SHALL fall back to the filled template.

### R4 Hatch film
1. THE SYSTEM SHALL play `haggling-hatch-{temperament}.mp4` and fall back to `haggling-hatching-1.mp4` on error.

## Non-goals
LLM ops, template marketplace, enacting teen morphing (opt-in is stored only).
