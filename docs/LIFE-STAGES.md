# Kiro - Life stages crib sheet (DRAFT to agree, 20 Nov 2026)

One place for what changes at each stage. Owner ideas are marked **(owner)**; the rest is
Kiro's brainstorm. Nothing in "Behaviour" or "Lines" is coded yet: agree or change, then
Kiro codes it as one table in the care engine (`packages/care-engine`), so phone and
server stay the same. Numbers are first guesses and easy to tune.

## Stages (agreed 18 Nov) and assets

| Stage | Days | Portrait (still) | Stage film | Status |
| --- | --- | --- | --- | --- |
| Baby | 0-7 | `haggling-care-<type>.jpeg` (have) | hatch film + playing film (have) | live |
| Child | 7-14 | `haggling-child-<type>.jpeg` | `haggling-child-play-<type>.mp4` | **Keep or merge into Baby? (owner)** |
| Teen | 14-24 | `haggling-teen-<type>.jpeg` | `haggling-teen-play-<type>.mp4` | owner making now |
| Adult | 24-36 | `haggling-adult-<type>.jpeg` | `haggling-adult-play-<type>.mp4` | to make |
| Old age | 36-42 | `haggling-elder-<type>.jpeg` | `haggling-elder-play-<type>.mp4` | to make |
| Departed | day 42 | `haggling-ghost-<type>.jpeg` (have) | - | live |

`<type>` = douce, skeigh, ill-trickit, ree, radge, fair-wud. Drop files in
`apps/mother/public/art/`. Each stage film unlocks in Watch again (newest first) with a
notification when the stage begins.

## What matters most at each stage

| | Baby | Child | Teen | Adult | Old age |
| --- | --- | --- | --- | --- | --- |
| Sleep | 10 h, essential **(owner)** | 9 h | 10 h, essential **(owner)**, wakes crabbit before 10am | 7 h **(owner: less as they age)** | 6 h, plus a wee nap |
| Feed | as now | as now | snacks over meals | **loves food, gourmet lines (owner)** x1.5 mood | soft food, x1.2 |
| Cuddle | x1.5, adores it | as now | **rejected: Mood -3, "Really?!" (owner)** | as now | x1.5, loves it again |
| Walk | short, x0.8 | x1.3, wants to play out | **x1.5 (owner)** | **important (owner)** x1.3 | knees: Energy cost x1.5, Mood x0.8 |
| Treat | as now | x1.2 | **x1.5 (owner)** | x0.7, "watching the waistline" | as now |
| Clean up | as now | grumbles, x0.8 | bedroom chaos: Mess grows x1.3 | **important (owner)** x1.5 | as now |
| Weather | as now | as now | moodier: swings x1.3 | as now | calmer: swings x0.7 |
| Decay | as now | as now | as now | as now | slower, x0.8 |

## Lines (examples; Kiro writes the rest in the same voice)

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

**On asking an AI for "popular teenage culture where the Haggis lives":** Kiro's advice is
not now. It needs a paid AI service and a new key, its answers need checking (brand names,
unsuitable content, things going out of date), and it slows the photo reply. A written
list per stage gets the same laugh, reliably. A later version could let an AI rewrite one
line at a time inside strict rules (like the birth-story plan), with the written line as
the fallback.

## Laddie or lassie (built 20 Nov)

Chosen at naming: "Wee laddie (boy)" or "Wee lassie (girl)". Stored with the Haggling.

## Teen identity (needs owner decisions; nothing built)

The sign-up already asks "When they reach teen age, allow identity morphing" with a
disclaimer ("it may not go the direction I want"). Kiro's advice before building:

1. **Two different things are in the proposed list.** Gender identity (stays the same,
   trans, non-binary) and sexual orientation (straight, gay). Orientation only matters
   once there is dating (post-hackathon). Suggestion: teen stage covers gender identity
   only; orientation waits for the dating feature.
2. **Leave "Furry" out of this list.** Furry is a fandom, not an identity, and listing it
   next to trans and non-binary can read as a joke at trans people's expense, which
   judges and players may take badly. It would work well elsewhere: a teen "fluffy phase"
   look or costume, which suits a furry wee beast.
3. **Choice or random?** The disclaimer already implies the Haggling decides, not the
   carer. Suggestion: around day 17, an opted-in Haggling tells the carer who they are.
   Most stay as they hatched, some find they are the other gender, some non-binary. No
   outcome is better or worse in the game: no points, no penalty, a warm scrapbook line,
   and the carer can only respond with support. Carers who did not opt in see no change.
4. **Tone:** the Scottish humour stays on everything else (food, weather, the knees);
   never on the identity itself.

Owner to decide: choice or the Haggling decides; the options; the day it happens.
