# Kiro - Requirements: lifespan-graveyard

Status: DRAFT v2 (18 Nov 2026). Owner decisions: **6-week life**, stages, a demo fast-forward.
Owner is making the stage and graveyard images. The stage content (what each stage
does) is **to be agreed**: see "Stage plan" below.

## Overview
A Haggling lives about 6 weeks, growing through stages. At the end it departs: the
scrapbook gets a final page, the mother's graveyard keeps it, and the carer may keep
a read-only ghost and is invited to claim a new egg. Neglect darkens the story but
never ends a life early.

## Stage plan (proposal, owner to confirm)

| Stage | Days | Look | New in this stage (proposal) |
| --- | --- | --- | --- |
| Baby | 0-7 | baby portrait (have) | Feed, cuddle, walk, treat, clean, Photo Treat, weather |
| Child | 7-14 | child portrait (needed) | Playing film (have); later: Body XP / Brain XP |
| Teen | 14-24 | teen portrait (needed) | Optional identity morphing (opt-in from signup, already stored); moodier weather swings |
| Adult | 24-36 | adult portrait (needed) | Steadier mood; later: discoverable / dating (post-hackathon) |
| Old age | 36-42 | elder portrait (needed) | Slower decay, more scrapbook memories ("remember the storm of...") |
| Departure | day 42 | headstone + ghost (needed) | Final scrapbook page, graveyard, ghost choice, "claim a new egg" |

For the **hackathon demo**, show Baby, say the stages out loud, then fast-forward to
Departure and the graveyard (owner, 18 Nov).

## Requirements (EARS)

### R1 Lifespan
1. WHEN a Haggling is named, THE SYSTEM SHALL record `born_at` and `span_ends_at = born_at + 42 days` on the server; both immutable.
2. THE stage SHALL follow from age (table above), computed the same way on phone and server (shared care engine).
3. THE care screen SHALL show the stage and "N days left" (e.g. "Teen · 23 days left").

### R2 Departure
1. WHEN now >= `span_ends_at`, THE SYSTEM SHALL set `departed_at` once and stop care actions, reminders and weather.
2. A scheduled job SHALL depart Hagglings even when no device is open.
3. Departure SHALL write a final scrapbook page and one graveyard entry, and offer "Claim a new egg".
4. THE SYSTEM SHALL NOT end a life early.

### R3 Neglect without death
1. A rolling mood average SHALL set the tone (bright / dim / dark): darker scrapbook wording, darker background, matching epitaph.

### R4 Graveyard
1. THE mother page SHALL show the graveyard: name, type, days lived, tone, epitaph, last scrapbook lines; departed Hagglings' public cards become memorials.
2. Carer's own graveyard on the phone after departure.
3. (Future, logged) Explorable 3D isometric graveyard: `docs/IDEAS-FUTURE-DEV.md` B.

### R5 Ghost (read-only)
1. On departure, ask once whether to keep a ghost; a ghost shows a faded portrait and last 5 scrapbook lines, no care.

### R6 Demo fast-forward (owner, for filming)
1. THE hidden demo menu SHALL offer "Next stage" and "Skip to the end" for **demo eggs only** (claimed with the demo wait).
2. Fast-forward SHALL move `born_at`/`span_ends_at` back on the server through an owner-only function that refuses non-demo eggs, so phone, server and graveyard agree.

## Images needed from owner
Per temperament (douce, skeigh, ill-trickit, ree, radge, fair-wud) or one shared set, owner's choice:
- `haggling-child-<temperament>.jpeg`, `haggling-teen-<temperament>.jpeg`, `haggling-adult-<temperament>.jpeg`, `haggling-elder-<temperament>.jpeg`
- `headstone.png` (or per temperament), `ghost-<temperament>.png` (or a filter on the portrait)
- optional `graveyard-backdrop.jpeg` for the mother page

Until images exist, the baby portrait is used with a stage badge.

## Security considerations
Lifespan and departure decided by the server; the fast-forward function only works on the owner's demo eggs. Graveyard rows protected by RLS; public memorial cards show the same safe fields as share cards.

## Non-goals
Rebirth/inheritance, dating, ghost behaviours, early death, paid resurrection.
