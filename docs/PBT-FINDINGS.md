# Kiro - Property-based testing: what it found (22 Nov 2026)

## What was done
Kiro read the requirements in `.kiro/specs/*/requirements.md` (EARS format), plus
`docs/GAME-DESIGN.md` and `docs/LIFE-STAGES.md`, and turned each testable rule into a
**property**: a statement that must hold for *every* Haggling and every sequence of care.
[fast-check](https://fast-check.dev) then generates 300 random cases per property
(random Hagglings, random button-mashing over random times, random names including
hostile ones, random time zones) and shrinks any failure to the smallest example.

| File | Covers | Properties |
|---|---|---|
| `packages/care-engine/test/properties.test.ts` | bars, XP, Photo Treat, sleep, Tell off, Haggis Run, weather, sync merge, life stages, levels, films, identity, text templates, damaged saves | P1-P27 |
| `packages/care-engine/test/properties-timezone.test.ts` | same answer on phone and server in any time zone | P28 |
| `supabase/functions/_shared/properties.test.ts` | claim validation, email and link-preview escaping, slugs, cron secret, reminders, quiet nights, photo recognition | S1-S14 |
| `apps/mother/test/properties.test.ts` | public scrapbook lines, "time ago" | A1-A3 |

Result on the first run: **45 properties, 38 held, 7 found real problems.**
A second random run caught one more case of F4 (property P25) and one bug in a test itself (S11).

**Status 22 Nov 2026: all fixed. 45 of 45 hold** (161 tests in total), across 11 back-to-back random
runs. The owner chose option (a) for F3. They run with `npm test` and in GitHub CI on every push.

| Finding | Fix | Where |
|---|---|---|
| F1 bars froze while open | Exact fractions inside the engine, rounded only on screen and when saved (`wholeBars`); hungry/messy Mood cost per awake hour; meal and bed checks use the bar *at* that hour | `packages/care-engine/src/tick.ts`, `CareScreen.tsx` Meter, `lib/cloud.ts`, `photo-treat` |
| F2 UTC on the server | `EngineContext.timezone`; `localTime()` for hours and dates; Photo Treat and reminders pass the carer's zone | `tick.ts`, `photo-treat`, `_shared/reminders.ts` (both deployed) |
| F3 teen weather | Spec now says limits x1.3 for teens, x0.7 in old age | `.kiro/specs/weather-mood/requirements.md` R4.2 |
| F4 `$` in names | Replacement functions in all 5 templates | `tick.ts`, `life.ts`, `stages.ts`, `weather.ts`, `photoMatch.ts` |
| F5 damaged save | Unreadable time treated as "now" and repaired | `tick.ts` |
| F6 "30 hours ago" | "yesterday", "3 days ago" | `lib/feed.ts` |
| F7 spec drift | Three requirements updated with date and reason | care-sleep R1, photo-care R1.3, public-feed R5 |

Measured after the fix (same cases as below): app open and app closed now agree to within 1 point.

## Findings, most important first

### F1 (High) Bars freeze while the app is open, and a hungry or messy Haggling's mood crashes
**Property P5:** "checking often or rarely gives about the same bars". Failed on the first case.

**Cause:** the phone re-checks the Haggling every 30 seconds while the care screen is open.
Each check rounds the bars to whole numbers, and a 1-minute drop (Hunger 0.15) rounds back
to nothing, so the clock moves on but the bars do not. Separately, the "hungry" (-3 Mood) and
"messy" (-4 Mood) penalties are applied **per check**, not per hour.

**Measured** (Kiro ran it):

| Situation | App closed | App open the whole time |
|---|---|---|
| Fed and clean, 2 hours | Hunger 80 -> 59, Mood 80 -> 72 | **nothing changes** (80, 80) |
| Hungry (Hunger 20), 30 min | Mood 80 -> 75 | Mood 80 -> **20** |
| Messy (Mess 80), 30 min | Mood 80 -> 74 | Mood 80 -> **0** |

This is why demos looked calm with the screen open: the bars were not moving. A carer
who leaves the app open with a hungry Haggling sees Mood plunge in minutes.

**Solution (recommended):** keep exact fractions inside the engine, and round only when
showing a bar or saving to the database (the columns are whole numbers). Scale the hungry
and messy penalties by hours (`3 per hour`, not per check). About 1-2 hours including tests;
P5 then passes and stays as a guard.
Alternative (smaller): only re-check every 15 minutes. Simpler, but bars still jump in steps and
rounding still drifts.

### F2 (Medium) The server judges meal and bed times in UTC, not the carer's time
**Property P28:** "same bars on a UK phone, a New York phone and the UTC server". Failed.

**Cause:** the engine reads the hour from the computer it runs on. On the phone that is right.
On Supabase it is UTC, so when the Photo Treat function ticks a Haggling, "missed breakfast"
is checked against UTC. UK carers are fine in winter (UK = UTC) but an hour out in summer;
**US judges** are 5-8 hours out, so they can lose Health XP for a "missed breakfast" at 3am.

**Solution:** pass the carer's time zone into the engine (`EngineContext.timezone`) and use the
existing `localClock()` helper for hours and dates. The phone passes its own time zone; the
server passes the one saved with the reminders or weather settings. About 1 hour.

### F3 (Low, needs your decision) Teens break the weather limit in the spec
**Property P14:** weather-mood R4.2 says one weather slot moves Mood at most 12 and Energy at
most 6. Teens swing x1.3 (agreed in LIFE-STAGES), which gives up to Mood 16 and Energy 7.
Smallest example: a Skeigh teen on a crisp day, Energy +7.

**Solution, pick one:** (a) keep teens moodier and change the spec to "x1.3 for teens"
(Kiro updates the requirement and the property), or (b) cap after the swing so the spec holds.
Recommendation: (a), it was a deliberate design choice.

### F4 (Low) Names with a `$` sign get mangled
**Properties P26, S14:** a Haggling called `$$` shows as `$`; `Mo$&lly` turns into
`Mo{name}lly` in weather lines, epitaphs, mischief and Photo Treat lines.
**Cause:** JavaScript's `replace()` treats `$&`, `$$` and friends as special codes.
**Solution:** replace with a function (`.replace(/\{name\}/g, () => name)`) in the 5 places.
10 minutes.

### F5 (Low) A damaged save turns every bar into "NaN" for good
**Property P27:** if `lastTickAt` is ever unreadable (a corrupted phone save, a bad import),
every bar becomes NaN and never recovers.
**Solution:** treat an unreadable time as "now" (no decay, no penalty) and repair it. 10 minutes.

### F6 (Cosmetic) The public scrapbook says "30 hours ago"
**Property A3.** When the brood is quiet, old lines read "30 hours ago", "200 hours ago".
**Solution:** "yesterday", then "3 days ago". 5 minutes.

### F7 (Spec drift, no code bug) Three specs no longer match what the owner decided
Found while mapping requirements to properties:
- care-sleep R1: "sleep for 8 hours". Now 6-10 hours by life stage (LIFE-STAGES, 20 Nov).
- photo-care R1.3: "long side <= 1280 px". Code uses 1600 px (sharper can lettering, owner).
- public-feed R5: "ticked by default". Now off by default (owner, 19 Nov).
**Solution:** Kiro updates the three requirements with the date and reason. 10 minutes.

## What held (38 properties), so you can say so with confidence
- Bars always 0-100 whole numbers; Health XP never above 100; "sick" always matches Health XP below 0.
- Life XP never goes down, through any mix of care, weather, Photo Treats and time.
- Care XP capped at 30 a day however many buttons are pressed.
- Photo Treat: exact reward, once a day.
- Sleep: cuddles and cleaning never wake them; feed, walk, treat and play always do; no bedtime penalty while asleep.
- Tell off: fair and unfair costs exactly as designed; mischief rates match the temperaments within 3%.
- Haggis Run: Mood +4 per win, capped at 5 wins; Energy -8.
- Weather: a slot applies once only; weather never touches Health XP or Life XP.
- Sync merge: latest meters win as one block, cloud wins ties, nothing in the scrapbook or weather list is lost, merging twice changes nothing, traits always come from the cloud.
- Life: stages, days and days-left only move forward; never ends early. Levels match the thresholds.
- Identity: off unless opted in, nothing before Teen, same answer every time, a settled teen identity never changes.
- Security: claim validation never crashes on junk, never keeps the email in answers, slugs always URL-safe; emails and link previews never carry markup from user text; the cron secret opens only on an exact match.
- Reminders: sensible in any time zone, no duplicates, nothing while asleep, meals only at their hour; quiet hours exactly 22:00-06:59.
- Photo recognition never crashes; unrelated objects in a photo never change the answer.

## For the Devpost write-up
"We used Kiro to turn our EARS requirements into 45 fast-check properties. 38 held across
hundreds of random cases each. 7 failed. The biggest was a bug our example tests had missed since
the engine was written: with the app open, the bars stopped moving, because a 30-second re-check rounded each tiny
drop back to zero, while hunger and mess penalties hit every 30 seconds instead of every hour.
Example tests only checked one big jump in time, so they never saw it."
