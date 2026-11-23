# Kiro - Requirements: seasonal-costumes
Status: AGREED with the owner, 23 Nov 2026. Art: owner. Dates: owner.

## Overview
At certain times of year a Haggling dresses up. The costume replaces the portrait for the
life stages and temperaments that have costume art; everyone else keeps their usual picture.

## Seasons (owner, 23 Nov)
| Season | Dates (inclusive, carer's local date) | Art so far |
|---|---|---|
| Halloween | 15 Oct - 1 Nov | Child, all six temperaments |
| St Andrew's Day | to come | - |
| Christmas | to come (next art set) | - |
| Burns Night | to come | - |
| Easter | to come (moves each year: dates per year) | - |

## Requirements (EARS)
### R1 When the costume shows
1. WHILE today's local date is inside a season's dates, AND costume art exists for the Haggling's life stage and temperament, THE care screen, start-up screen and public card SHALL show the costume portrait.
2. OTHERWISE THE SYSTEM SHALL show the normal stage portrait.
3. A season's dates SHALL be allowed to run over New Year (e.g. 20 Dec - 6 Jan).
4. At most one season SHALL be active on any date.
5. Departed Hagglings (final page, graveyard) and the "Growing up" pop-up SHALL keep the normal stage portrait.

### R2 Saying so
1. WHEN a costume shows on the care screen, THE portrait SHALL carry a small badge naming the season (e.g. "🎃 Halloween").

### R3 Filming (demo)
1. THE hidden demo menu SHALL offer "Costume preview" for each season with art, and "Off".
2. WHILE a preview is on, THE costume SHALL show on any date (still only where art exists).
3. `?costume=<season>` in the address SHALL turn the preview on; `?costume=off` SHALL turn it off.

### R4 Art
1. Costume art SHALL be named `/art/haggling-<stage>-<season>-<temperament>.jpeg`, long side 1024 px, JPEG.
2. Every file named in the season table SHALL exist in `apps/mother/public/art/`.
