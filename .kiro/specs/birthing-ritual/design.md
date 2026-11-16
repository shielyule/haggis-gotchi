# Kiro - Design: birthing-ritual (reconciled 16 Nov 2026)

## As built

- `SignupForm.tsx` -> `claimEggSynced(answers, waitMs)`; wait is 90s (demo) or 30 min.
- `data/birthStories.ts`: 20 skeletons. `pickStory`, `storyForAnswers`, `fillBeat`, `filledBeats`, `beatIndex(createdAt, readyAt, now)` returns which beat to show.
- `data/temperaments.ts`: six bands by chaos (Douce 0-16, Skeigh 17-33, Ill-trickit 34-50, Ree 51-66, Radge 67-83, Fair Wud 84-100); `hatchFilmFor`, `carePortraitFor`.
- `NestApp.tsx` runs the waiting view, `HatchFilm` (falls back on error), then `NameHagglingForm`.

## Decisions
- Templates first, AI second. Elaboration (if built) is one beat, constrained by `scottish-folklore.md`, with the filled template as fallback.
- Teen opt-in is stored in answers and never acted on in MVP.
- Wait duration is a number, not a mode: `waitMs` is set at claim and persisted as `ready_at`, so the cron email and the UI agree.

## Known issues
- Signup answers (including email) are stored in `eggs.answers` jsonb and `eggs.email`: duplicate PII, handled in `security-hardening` (T4).
- `slug` is user-derived and not unique per carer: `nest-and-ready` covers collisions.
