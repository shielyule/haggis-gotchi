# Kiro - Requirements: graveyard-3d (Tier A, painted kirkyard)
Status: DRAFT v2 (18 Nov 2026). Replaces the full 3D brief. Source: owner's Haggis Kirkyard brief, scaled down for the hackathon.
Depends on: `lifespan-graveyard` (`graveyard_entries`, `public_graveyard()`).
## Overview
Page `/haggis-graveyard`: four painted views of the kirkyard (Day or Night, Above or Below ground) with a simple switcher. Hotspots with pop-ups, drifting ghosts and live graves come in later phases.
## Phases
1. **Page and switcher** (built, T1 to T3).
2. Hotspots with pop-ups (lore, image, optional video), per view. Dev tool to draw them.
3. Moving ghosts (cut-out image, path A to B, fade out).
4. Live graves on the Lower Brae slots from `public_graveyard()` plus earth mounds for filled plots.
## Requirements (EARS)
### R1 Page
1. THE route `/haggis-graveyard` SHALL work on any device without sign-in and load in its own code chunk.
2. THE page SHALL show one of four views, chosen by two toggles: Day/Night and Above/Below ground.
3. WHEN a toggle changes, THE page SHALL cross-fade to the new view and keep at most two images in the page.
4. THE view SHALL be readable from `?time=day|night&level=above|below`; unknown values fall back to Day, Above.
5. WHEN `prefers-reduced-motion` is set, THE fade SHALL be off.
6. Each image SHALL have alt text. Toggle buttons SHALL be keyboard operable and show pressed state.
### R2 Images
1. Source art: `Graveyard_<level>_<time>_USE.jpeg`, 2400 x 2400. Served as WebP at 1600 and 2400 from `/graveyard/<level>-<time>-<width>.webp`.
2. All four views SHALL share the same framing, so one set of hotspot coordinates works for every view. If a replacement image drifts, hotspots become per view.
### R3 Phase 4 (later): graves
1. THE page SHALL place a stone sprite or earth mound on each Lower Brae slot, from a slot list (percent coordinates) in JSON.
2. WHEN graves exceed the slots, THE page SHALL show a "see all graves" list. The painting is extended later by new artwork.
## Security considerations
Static public page. No writes, no new tables, no new third party. Only fields from `public_graveyard()` will ever reach the page (phase 4). Images are first-party. Video, if added, is first-party and size-capped.
## Non-goals
3D rendering, free orbit, the Undertaker's Ledger, cause of death, pinch of salt, games, audio.
