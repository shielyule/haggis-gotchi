# Kiro - Design: play-film

## Assets
Copy the six files into `apps/mother/public/art/` under the repo names (about 3.6-5.9 MB each, like the hatch films). Add `PLAY_FILMS` next to `HATCH_FILMS` in `data/temperaments.ts`.

## Unlock (no new database state)
- Hatch time = `children.created_at` (mapped to `haggling.hatchedAt`).
- Demo = the egg's wait was 2 minutes or less (`ready_at - created_at`), so the delay is 3 minutes instead of 24 hours.
- `memoryFilmsFor()` adds the play film when `now >= hatchedAt + delay`. Pure, unit-tested.

## Messages
- `care-reminders` job (every 15 minutes) adds a due item `play-film:{child}` once the delay has passed. Push as today.
- Email: same job, through a shared `_shared/sendEmail.ts` (Resend, already configured), skipped when a push was sent (`sent > 0`). Text built with the existing escaping helpers.
- Dedupe with `reminder_log` key `play-film:{child}` (push) and `play-film-email:{child}`.
- In demo mode the 15-minute job is too slow for 3 minutes, so the app also shows the film unlocking on screen ("New film in Watch again!") when the delay passes while open.

## Tests
Unit: unlock times (24 h, demo 3 min, before/after); due item appears once. Live: owner demo egg, film appears after 3 minutes, notification arrives.
