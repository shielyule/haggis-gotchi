# Kiro - Life stages crib sheet (AGREED and built 20 Nov 2026)

One place for what changes at each stage. Owner ideas are marked **(owner)**; the rest is
Kiro's brainstorm, kept by the owner. **Coded** as one table, `STAGE_RULES` in
`packages/care-engine/src/stages.ts`, used by the phone and the server. Change a number
there and every surface changes. Numbers are first guesses and easy to tune.

## Stages (agreed 18 Nov) and assets

| Stage | Days | Portrait (still) | Stage film | Status |
| --- | --- | --- | --- | --- |
| Baby | 0-7 | `haggling-care-<type>.jpeg` (have) | hatch film + playing film (have) | live |
| Child | 7-14 | `haggling-child-<type>.jpeg` (**have, 21 Nov**) | `haggling-child-play-<type>.mp4` (**have, 21 Nov**: reading, texting, gaming, dancing, parkour, skateboarding) | live |
| Teen | 14-24 | `haggling-teen-<type>.jpeg` (**have, 21 Nov**) | `haggling-teen-play-<type>.mp4` | portraits live; films to come |
| Adult | 24-36 | `haggling-adult-<type>.jpeg` | `haggling-adult-play-<type>.mp4` | to make |
| Old age | 36-42 | `haggling-elder-<type>.jpeg` | `haggling-elder-play-<type>.mp4` | to make |
| Departed | day 42 | `haggling-ghost-<type>.jpeg` (have) | - | live |

`<type>` = douce, skeigh, ill-trickit, ree, radge, fair-wud. Drop files in
`apps/mother/public/art/`. Each stage film unlocks in Watch again (newest first) with a
notification when the stage begins.

## What matters most at each stage

| | Baby | Child | Teen | Adult | Old age |
| --- | --- | --- | --- | --- | --- |
| Sleep | 10 h, essential **(owner)** | 9 h | 10 h, essential **(owner)** | 7 h **(owner: less as they age)** | 6 h |
| Feed | as now | as now | snacks over meals | **loves food, gourmet lines (owner)** x1.5 mood | soft food, x1.2 |
| Cuddle | x1.5, adores it | as now | **rejected: Mood -3, "Really?!" (owner)** | as now | x1.5, loves it again |
| Walk | short, x0.8 | x1.3, wants to play out | **x1.5 (owner)** | **important (owner)** x1.3 | knees: Energy cost x1.5, Mood x0.8 |
| Treat | as now | x1.2 | **x1.5 (owner)** | x0.7, "watching the waistline" | as now |
| Clean up | as now | grumbles, x0.8 | bedroom chaos: Mess grows x1.3 | **important (owner)** x1.5 | as now |
| Weather | as now | as now | moodier: swings x1.3 | as now | calmer: swings x0.7 |
| Decay | as now | as now | as now | as now | slower, x0.8 |

## Lines (all coded in `STAGE_RULES`; baby keeps the original lines)

- **Baby, cuddle:** "Wee Yin went soft as a clootie dumpling."
- **Child, walk:** "Wee Yin came back with a jam jar full of tadpoles and no shoes."
- **Teen, cuddle (rejected):** "Wee Yin pushes you away. 'Really?!'" **(owner)**
- **Teen, feed:** "Wee Yin ate it standing at the fridge, then asked what's for tea."
- **Teen, put to bed:** "Wee Yin says they're not even tired. Asleep in four minutes."
- **Adult, feed:** "That gourmet neeps and tatties with the creamy whisky sauce really was divine!" **(owner)**
- **Adult, clean:** "Wee Yin hoovered, then hoovered again. Very satisfying."
- **Old age, walk:** "Wee Yin made it to the end of the road and told everyone about it."
- **Old age, cuddle:** "Wee Yin held on a wee bit longer than usual."

## Photo Treat by age **(owner)**

Same five treats (Irn-Bru, bagpipes, kilt/tartan, heather, shortbread), different lines:
- **Baby:** "Wee Yin spotted the Irn-Bru and did a wee jig."
- **Teen:** "Wee Yin necked the Irn-Bru in one and burped the national anthem."
- **Adult:** "Wee Yin poured the Irn-Bru into a proper glass. With ice. Classy."
- **Old age:** "Wee Yin remembers when Irn-Bru came in glass bottles and you got 10p back."

Coded: `treatLine()` in `supabase/functions/_shared/photoMatch.ts` (all five treats for
teen, adult and old age; baby and child keep the original lines).

**On asking an AI for "popular teenage culture where the Haggis lives":** agreed: not now. It needs a paid AI service and a new key, its answers need checking (brand names,
unsuitable content, things going out of date), and it slows the photo reply. A written
list per stage gets the same laugh, reliably. A later version could let an AI rewrite one
line at a time inside strict rules (like the birth-story plan), with the written line as
the fallback.

## Laddie or lassie (built 20 Nov)

Chosen at naming: "Wee laddie (boy)" or "Wee lassie (girl)". Stored with the Haggling.

## Gender identity (AGREED and built 20 Nov)

Sexual orientation is **not** part of the game. Gender identity only; "Furry" dropped.

- **At hatch:** the carer picks wee laddie (boy) or wee lassie (girl).
- **Who it applies to:** only carers who ticked the sign-up box ("allow identity morphing" with the disclaimer). Everyone else: no change, ever.
- **Start of Teen (day 14):** the Haggling tells the carer who they are, chosen at random (same answer on every device):

  | Outcome | Chance (first guess) | Shown as |
  | --- | --- | --- |
  | Stays as hatched | 40% | Laddie / Lassie (no message) |
  | Trans | 25% | the other one: a trans lassie is shown as **Lassie** |
  | Non-binary | 20% | **Non-binary** |
  | Questioning | 15% | **Questioning** |

- **Start of Adult (day 24):** a questioning Haggling settles (stays as hatched, trans or non-binary).
- **The carer's response:** two buttons, both supportive: "Give them a big hug" (the one hug a teen accepts) or "Tell them you love them just the same". Each writes a warm scrapbook line.
- **No outcome scores better or worse.** No points, no penalty. The jokes stay on food, weather and knees, never on identity.
- Coded: `identityAt`, `identityLabel`, `identityMessage` in `packages/care-engine/src/stages.ts` (tests in `test/stages.test.ts`).

## On reaching a new stage (built 21 Nov)
- The portrait swaps to the stage picture (care screen, start-up screen, public card).
- A big "Growing up" announcement pops up once, with the new picture (and a note when the stage has a new film).
- The stage film unlocks at the top of Watch again (wired via `STAGE_FILMS` in `data/temperaments.ts`).
- A phone notification ("{name} is a Teen now!") from the lifecycle job.
- Demo menu (demo eggs): **+1 day**, **Next stage**, **Skip to the end**.

## Not built yet
- Stage portraits and stage films: drop the files in (names above) and Kiro wires them into `STAGE_PORTRAITS` / Watch again.
- Teen "wakes crabbit before 10am" and an old-age nap: left out to keep sleep simple.
