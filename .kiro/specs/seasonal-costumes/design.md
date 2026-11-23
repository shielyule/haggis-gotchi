# Kiro - Design: seasonal-costumes

`apps/mother/src/data/costumes.ts` (pure, no browser APIs):
- `SEASONS`: id, label, emoji, `from`/`to` as month-day, and `art[stage][temperament]`.
- `inWindow(md, from, to)`: inclusive; wraps over New Year when `from > to`.
- `seasonFor(md)`: the active season or null.
- `costumeFor(temperament, stage, md, preview)`: `{ src, season }` or null.
- `portraitFor(...)`: costume src, else `stagePortraitFor`.
The app reads the preview from `localStorage` (`haggis-gotchi:costume-preview`), set by the demo
menu or `?costume=`.

## Correctness properties (fast-check, `apps/mother/test/properties.test.ts`)
- **A4** (R1.1, R1.2) For any date, stage and temperament: a costume shows exactly when the date is
  inside a season and that season has art for the stage and temperament; otherwise the stage portrait.
- **A5** (R1.3) For any window and date, `inWindow` agrees with a day-by-day walk of the calendar,
  including windows that run over New Year.
- **A6** (R1.4) For every day of the year, at most one season is active.
- **A7** (R3.2) With a preview on, the costume shows on any date where art exists, never where it does not;
  "off" never shows a costume outside the dates.
- **A8** (R4.1, R4.2) Every art path follows the naming rule and the file exists.
Not properties: R1.5 and R2.1 (screens), checked by eye on Android.
