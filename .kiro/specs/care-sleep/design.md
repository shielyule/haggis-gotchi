# Kiro - Design: care-sleep
- Engine (`packages/care-engine`): `asleepUntil` on the Haggling; `tick` splits each gap into asleep/awake hours and wakes at the end; `applyCare('sleep')`; `RULES.sleepHours`, `wakesGrumpy`. Merged as part of the meter block (newest wins).
- Database: `children.asleep_until` (browser-writable care state); `check_ins.action` allows `sleep`; `public_feed()` includes it. Migration `20261119180000`.
- Server: `care-reminders` returns nothing while asleep, then a `wake:{child}:{asleep_until}` alert (dedupe key in `reminder_log`).
