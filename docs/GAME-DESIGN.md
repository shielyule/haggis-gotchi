# Kiro - Game design: what is built, what to revisit

Written 22 Nov 2026 after the review. One place to come back to when tuning the game.
Rules live in code in `packages/care-engine/src/rules.ts` (numbers) and
`stages.ts` (life stages). Life stages have their own crib sheet: `docs/LIFE-STAGES.md`.

## The loop
A Haggling lives about six weeks (Baby 0, Child 7, Teen 14, Adult 24, Old age 36,
goes to the glen on day 42). Hunger, Mood and Energy fall over time; Mess rises.
Health XP falls when a bar stays empty and makes them sick below zero.
Life XP only ever goes up and sets the level.

## Built on 22 Nov

### Haggis Run (mini-game)
- Folklore: a wild haggis has longer legs on one side, so it can only run one way round the hill.
- Five rounds of "clockwise or anticlockwise?". Pure chance (50/50 each).
- Each right guess: Mood +4. Playing costs Energy -8.
- Playing while they sleep wakes them crabbit (same as feed, walk, treat).
- Shows in the public scrapbook as "Fred just played Haggis Run with Harry".
- Code: `apps/mother/src/HaggisRun.tsx`, engine `case 'play'`.

### Discipline: mischief and Tell off
- Some hours they misbehave (a banner: "{name} has hidden your car keys in the porridge").
  Chance per hour by temperament: Douce 5%, Skeigh 10%, Ree 20%, Ill-trickit 30%,
  Radge 30%, Fair Wud 35%. The same hour gives the same answer on every device.
- **Fair telling-off** (they are misbehaving): Mood -5, the mischief stops for that hour.
- **Unfair telling-off** (they were good): Mood -15 and Health XP -3.
- Life XP never drops, so "reduces XP" was applied to Health XP only.
- Tell-offs never appear in the public scrapbook.
- Code: engine `isMisbehaving`, `mischiefLine`, `case 'scold'`; tests `discipline.test.ts`.

### Visible poop
- One 💩 on the portrait for every 25 Mess (up to four), with a gentle wobble.
  Clean up removes them. Reduced-motion phones get no wobble.

### Sound
- A short chirp for every action, made in the browser (no sound files).
- "Sounds" tick box on the care screen turns it off; saved on the phone.
- Code: `apps/mother/src/lib/chirp.ts`.

### Quiet nights (tick box, under reminders)
- No care reminders from 10pm to 7am (phone's time) and at most 6 a day.
- The egg-ready message is never held back: the carer has just asked for it.

### Two days left
- A gentle notification once, two days before the end, plus a line on the care screen.

### Identity moment
- New sign-up wording: "Let my Haggling tell me who they are when they're a teen" /
  "Your Haggling decides. Every answer is welcome."
- At the identity moment the carer may give them a new name, chosen together (optional).
- Non-binary Hagglings say "I go by they/them". All game text uses "they/them" for every Haggling.
- Questioning is not a phase: 1 in 4 stay questioning as adults.

## Level unlocks (suggestions, not built)
Levels from Life XP: 2 at 100, 3 at 300, 4 at 600, 5 at 1000, then every 500.
A carer who checks in most days reaches about level 6; a very keen one about level 10.

| Level | Unlock | Notes |
|---|---|---|
| 2 | Tartan bonnet (hat) | First reward, within the first week |
| 3 | Backdrop: the glen at dusk | Swap the care-screen background |
| 4 | Haggis Run "best of 10" | Longer game, same rules |
| 5 | Tiny sporran | Shows on portrait and public card |
| 6 | Backdrop: Edinburgh rooftops in the haar | |
| 7 | Bagpipe chirp set | Alternative sounds |
| 8 | Golden porridge bowl | Feed gives +2 Mood |
| 10 | "Chieftain o' the Puddin-race" badge | Burns' line, on the stone too |

### Seasonal costumes (BUILDING, owner's list 23 Nov; spec `.kiro/specs/seasonal-costumes`)
| Season | Dates | Art | Status |
|---|---|---|---|
| Halloween | 15 Oct - 1 Nov | Child x6 | **Live** (demo menu: Costume preview) |
| St Andrew's Day | owner to give | - | waiting for art |
| Christmas | owner to give | next art set | waiting for art |
| Burns Night | owner to give | - | waiting for art |
| Easter | owner to give (moves each year) | - | waiting for art |

Costumes replace the portrait for the stages and temperaments that have art; everyone else keeps their picture.
Add a season: drop the images in, give the dates, Kiro adds one row to `SEASONS` in `apps/mother/src/data/costumes.ts`.

## Humour line (agreed 22 Nov)
- **No swearing**, anywhere, including Scots words that read as swearing.
- **Drink jokes only for Adult and Old age** lines. Never for Baby, Child or Teen.
- **The whisky is always the carer's**, never the Haggling's. Irn-Bru is the Haggling's drink.
- Fun at the expense of the carer or the weather: yes. At anyone's identity, body or accent: no.
- Public names (graveyard, scrapbook) go through the blocklist filter in the database.

## To revisit
- **Idle animation:** the portrait is a still. A slow breathing loop (CSS scale) or a blink would make them feel alive.
- **Photo Treat outside Scotland:** five Scottish items are hard to find abroad. Add "anything tartan" (already counts), a cup of tea, or rain on a window.
- **Sick cure:** today care slowly lifts Health XP. A clear cure (medicine button, or a Photo Treat cures) would be easier to understand.
- **Pacing:** check day 10-20 on a real phone. Too many reminders? Bars falling too fast for working carers?
- **Questioning to as-hatched:** when a questioning teen settles as a laddie or lassie at Adult, there is no message yet. Add a warm one.
- **Haggis Run skill:** pure chance now. Could add a hint (temperament leans one way) so it rewards knowing your Haggling.
- **Mischief while away:** the banner only shows when the app is open. A "while you were out" line could list missed mischief.
