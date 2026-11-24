# Kiro - Devpost submission answers (draft, 23 Nov 2026)

Copy each block into the matching field. Lines marked **[OWNER]** need your answer:
only you can give them. Every number below was checked in the repo on 23 Nov.

---

## 1. About the project (Markdown)

## Inspiration
Tamagotchis lived in your pocket and died in a drawer. They never knew it was raining, that you
had a bad day, or that there was a can of Irn-Bru on the desk. We wanted a pet that notices
*your* world, and Scotland gave us the perfect creature: the wild haggis, which (as every Scottish
child is told) has longer legs on one side so it can only run one way round a hill.

Haggis-gotchi is a wee folklore pet that hatches from an egg on your phone, lives for about six
weeks, feels your real weather, and is buried in the mother's kirkyard when it goes to the glen.
The Frankenstein part: a cloud "mother" page, a phone-first web app, a server-side care engine,
real weather, image recognition and push notifications, stitched into one creature that is never
copied, only moved.

## What it does
- **Claim an egg** on your phone (no app store: it installs from the browser). Answer a few
  questions; they write a birth story and choose one of six Scots temperaments, from *Douce*
  (gentle) to *Fair Wud* (completely wild). Twenty seconds later it hatches, with its own film.
- **Care for it**: feed, cuddle, walk, treat, clean up, put to bed, play **Haggis Run** (guess
  which way it runs round the hill), and **tell it off**, fairly or unfairly, when it gets up to mischief.
- **It feels your weather.** Three times a day the real forecast for your rough area (about 11 km,
  never your exact location) changes its mood. Douce loves rain, Skeigh hides from thunder,
  Fair Wud lives for storms, and every haggis loves the haar.
- **Photo Treat**: snap shortbread, heather, tartan, bagpipes or Irn-Bru and Amazon Rekognition
  checks it. Every bar fills. A Coke can is politely refused.
- **It grows up** through Baby, Child, Teen, Adult and Old age, with new art and films at each
  stage, life-stage rules (teens refuse cuddles in public, old knees prefer gentle walks), and
  seasonal costumes (Halloween, St Andrew's Day, Christmas, Burns Night, Easter).
- **Who they are is theirs to decide.** If the carer opts in, at Teen the Haggling may tell them
  who they are: still a laddie or lassie, trans, non-binary (they/them) or not sure yet. It is
  random on purpose and every answer scores the same. The carer's only job is to support them.
- **It keeps a diary.** Every night Amazon Nova writes a page in the Haggling's own voice from what
  really happened: the weather in your town, the care it got, its life stage, the season. On a stormy
  day it's all about the storm. Every page ever is kept in an ornate scrapbook book, with tabs by week.
- **Show it anything.** Photograph something that isn't a treat and it reacts in character ("A dog!
  Wee Yin is up the curtains"). Only the object labels go to the AI, never the photo, never people.
- **A second game:** a daily Scottish folklore riddle (kelpies, selkies, the Callanish Stones...),
  the same for everyone, one guess a day.
- **It reminds you** (push notifications) at meal times and bedtime, with a quiet-nights setting.
- **Life ends.** After about six weeks it goes to the glen: an epitaph written from how it was
  treated, a stone in the mother's graveyard, and an optional wee ghost.
- **The mother page** (desktop) shows the brood, a live public scrapbook ("Fred just fed Harry ·
  2 min ago") and a painted 3D kirkyard. Each Haggling can have a public share card.

## How we built it
Built in **Kiro IDE**, spec first. Every feature went requirements (EARS) → design → tasks → code,
and the commits name the spec and task. There are 16 specs in `.kiro/specs`.

- **One care engine, everywhere.** `packages/care-engine` is pure TypeScript. The same rules run on
  the phone, in Supabase Edge Functions (Deno) and in tests. A Haggling decays continuously, for
  example
  $$\text{hunger}(t) = \max\!\big(0,\; h_0 - 9\,t\,w\,s\big)$$
  where $t$ is awake hours, $w$ the temperament factor (1.15 for the wild ones) and $s$ the life-stage
  factor. Life XP only ever rises, and levels follow D&D-style thresholds: level 2 at 100,
  then 300, 600, 1000, and $+500$ after that.
- **Stack:** React + Vite PWA on Cloudflare Pages (with a Pages Function for share-card previews),
  Supabase Postgres with row-level security, Edge Functions and pg_cron (reminders every 15 minutes,
  weather three times a day, lifecycle every 5 minutes), Supabase Vault for secrets, Web Push (VAPID),
  Resend for email, Cloudflare Turnstile, Open-Meteo, Amazon Rekognition, and Amazon Bedrock
  (Amazon Nova Lite) for the diary, photo reactions and riddles. Every AI line is checked by our own
  rules and has a written fallback, so the game never depends on the AI.
- **Steering** keeps Kiro on our rules: Scottish folklore voice, security, tech choices, how to
  write instructions for a non-specialist owner, and property-based tests on every feature.
- **Hooks:** a secret guard blocks key-shaped strings before they are written; a domain-language
  guard keeps the Scottish care voice (and keeps crypto-speak out); a schema reminder runs after every
  migration; and a hook keeps property tests in step whenever a spec's requirements change.
- **MCP:** we wrote our own `haggis-weather` MCP server, so Kiro could ask "what would a Radge
  Haggling feel on a hot day?" while designing, and used the AWS documentation MCP server to build
  the Rekognition integration.
- **Property-based testing:** Kiro turned the EARS requirements into 50 fast-check properties
  (hundreds of random Hagglings, care sequences, names and time zones each). Tests run in GitHub CI
  *and* inside the Cloudflare build, so a broken rule cannot be deployed.
- **Parallel Kiro sessions:** a second Kiro session built the 3D graveyard in its own git worktree,
  from a written handover, while the main session carried on.

## Challenges we ran into
- **Too fiddly, so we pivoted.** The first design hatched the egg on a desktop and moved it to the
  phone with three codes and two emails. The first real test showed nobody would do that several
  times a day. Halfway through, we went phone-first: one sign-in code, install from the browser,
  and a "home device" so a Haggling is never copied, only moved. The pivot is written up in the repo.
- **A setup guide that cost two hours.** Supabase changed its default table grants on 30 Oct 2026.
  A Kiro-written setup guide didn't know, and two guessed fixes failed. We wrote an incident
  record and a new steering file (`owner-instructions.md`): check the provider's changelog first,
  run read-only checks before asking a human, one action per step, say what you should see.
  It has not happened again.
- **Bars that froze while you watched.** Example tests passed for days. Property tests found
  that the phone's 30-second re-check rounded each tiny drop back to zero, so with the app open
  the bars never moved, while hunger and mess penalties hit every 30 seconds instead of every hour.
  The same suite found that the server judged "missed breakfast" in UTC, not the carer's time zone.
- **Amazon Bedrock gave us zero tokens.** We built the AI diary, photo reactions and riddles on Amazon
  Nova (Bedrock). Our new AWS account turned out to have a daily token quota of **0**, marked "not
  adjustable"; every call returned "Too many tokens per day" (14 calls, 0 successful). The quota AWS
  Support suggested was not adjustable either, and the support case was closed automatically by an AI
  helper. Because every AI feature has a written fallback, players never saw a failure. The full record is
  in `docs/INCIDENT-2026-11-23-aws-bedrock-quota.md`.
- **Recognising a can of Irn-Bru.** Rekognition often can't read the sideways logo. Testing real
  photos showed it reads the slogan "ORIGINAL AND BEST" at 98-100% in any orientation, so the rule
  is "slogan + a drink container".
- **Getting identity right.** We took advice and changed the wording until it said what we meant:
  "Your Haggling decides. Every answer is welcome."

## Accomplishments that we're proud of
- It's a real product: live at haggisgotchi.com, installable, with push notifications, a privacy
  notice, account deletion, security headers and a bot check.
- 166 automated tests, 50 of them property-based, written from the specs. They found 7 real bugs
  that example tests missed, and every one is fixed.
- Original art for six temperaments across five life stages: 36 short films (hatching, playing
  and one for each stage), ghosts, and 30 seasonal costumes.
- A pet that respects you: rough location only, photos never stored, public pages off by default,
  and an identity moment designed to be kind.
- An honest build record in the repo: what came before Kiro, the pivot, the incident, and the
  test findings.

## What we learned
- **Specs pay off most when they are honest.** Rewriting the early specs to match the real code,
  with tasks ticked only when they were true, made every later feature faster.
- **Property tests find a different kind of bug.** Unit tests check the examples you thought
  of; properties check the rule. Our worst bug only appeared when time passed in many small steps.
- **Steering is how you teach Kiro from your mistakes.** One bad afternoon became a rule that
  changed every guide after it.
- **Fiddly kills a toy.** Test the whole flow on a real phone early.

## What's next for Kiroween - Haggisgotchi
- Costumes and unlocks for every life stage (hats, backdrops, a "Chieftain o' the Puddin-race" badge).
- More Photo Treats that work outside Scotland (anything tartan, a cup of tea, rain on a window).
- Idle animation, so the portrait breathes and blinks.
- A Raspberry Pi "hearth": a second body for the same Haggling on your desk.
- Gaelic and Scots language options.

---

## 2-3. Built with (25 tags)
```
kiro, typescript, react, vite, node.js, deno, supabase, postgresql, pg-cron,
supabase-edge-functions, cloudflare-pages, cloudflare-pages-functions, cloudflare-turnstile,
amazon-web-services, amazon-rekognition, open-meteo, web-push, pwa, service-workers,
web-audio-api, fast-check, model-context-protocol, resend, github-actions, amazon-bedrock
```

## "Try it out" links
- https://haggisgotchi.com
- https://haggisgotchi.com/mother (the mother page, best on a computer)
- https://github.com/shielyule/haggis-gotchi (**make public first**)

## 4. Project name and elevator pitch
- **Project name:** `Kiroween - Haggisgotchi` (yours). Alternative: `Haggis-gotchi`, the name used on the site.
- **Elevator pitch (under 200 characters):**
  > A Scottish folklore pet that hatches on your phone, feels your real weather, grows up over six weeks and gets a stone in the kirkyard. Built spec-first in Kiro.

## 5. Form fields

| Field | Answer |
|---|---|
| Sponsor / Special Prizes | **Bonus Blog Prize** and **Social Blitz Prize** (tick once each post is live). Nothing else: no Kiroween 2025, not a startup, student or Crew app. Best Demo needs no tick |
| Submitter country of residence | United Kingdom |
| Age of majority | **[OWNER]** tick if you are 18 or over |
| Eligible jurisdiction | Tick (the UK is not excluded) |
| Category | **Frankenstein** |
| Public GitHub repo URL | `https://github.com/shielyule/haggis-gotchi` (make public first; MIT licence is in `LICENSE`; `/.kiro` is tracked) |
| Working demo URL | `https://haggisgotchi.com` |
| Were you registered for Kiroween 2025? | No |
| Submitter type | Individual |
| Organisation name | leave blank if Individual |
| Employee of AWS? | **[OWNER]** No (a Yes disqualifies) |
| Skills / likely to use Kiro again | **[OWNER]** your own view |

### Testing instructions (judges only)
```
Best on an Android phone in Chrome (works on iPhone Safari too).

1. Open https://haggisgotchi.com/?demo=1&new=1 . Tap "Add to home screen" (or "Carry on in the browser").
2. Sign in with any email address: you get a 6-digit code. No password.
3. Answer the questions. Tick "Demo wait" (10 seconds) to unlock the fast-forward
   controls below. Tick the teen identity boxes to see the identity moment.
4. Hatch, name your Haggling, then try Feed, Cuddle, Walk, Haggis Run, Tell off, Put to bed.
5. Demo menu: tap the Haggling's name 5 times quickly. You can:
   - set any weather (once per kind per day)
   - "+1 day", "Next stage", "Skip to the end" (demo eggs only)
   - "Costume preview" for each season
   - "Wake up now"
6. Photo Treat: point the camera at shortbread, heather, tartan, bagpipes or an Irn-Bru can (once a day).
7. On a computer, open https://haggisgotchi.com/mother for the brood, the live public scrapbook
   and the graveyard; https://haggisgotchi.com/haggis-graveyard is the painted kirkyard.
Delete your test account any time at https://haggisgotchi.com/privacy#delete
```

### Explain how your project meets the main technology requirement
```
Built in Kiro IDE, spec-first, from 16 Nov 2026 (see "pre-existing work").

- Specs: 16 specs in .kiro/specs, each with EARS requirements, a design and tasks
  (weather-mood, photo-care, lifespan-graveyard, sync-conflict, security-hardening,
  phone-home, care-reminders, seasonal-costumes...). Tasks are ticked only when verified;
  commits name the spec and task.
- Steering (.kiro/steering, 6 files): product, tech, Scottish folklore voice, security,
  owner-instructions (written after a real incident: check provider changelogs, read-only
  checks first, one action per step) and property-tests (every spec lists correctness
  properties; every task includes their tests).
- Hooks (.kiro/hooks, 4): secret-guard (PreToolUse, blocks key-shaped secrets),
  domain-language guard (PostFileSave, keeps the Scottish care voice), schema-regen
  reminder (after each migration), and properties-follow-requirements (PostFileSave on
  any requirements.md: update the spec's properties and fast-check tests, run them).
- MCP: our own haggis-weather MCP server (get_current_weather, classify_weather,
  weather_effect) used while designing temperament reactions; AWS Documentation MCP
  server for the Amazon Rekognition integration.
- Property-based testing: 50 fast-check properties written from the EARS requirements.
  They found 7 real bugs (e.g. bars froze while the app was open; the server judged meal
  times in UTC), all fixed. Tests gate GitHub CI and the Cloudflare build.
  docs/PBT-FINDINGS.md.
- Agents: Kiro sub-agents for validation (checking a finished change against the request)
  and for checking Kiro's own docs; a second Kiro session built the 3D graveyard in a
  separate git worktree from a written handover (docs/GRAVEYARD-3D-HANDOFF.md).
- Not used: custom agents, Powers, Kiro Crew.
```

### Disclose any pre-existing code or work
```
- 30 Oct - 15 Nov 2026: the first working version (mother page, nest, phone app,
  Supabase schema, ready-email job, care loop) was built in Cursor (Grok) while the
  hackathon Kiro credits were pending. Kiro took over on 16 Nov. The first four commits
  are that work; docs/PROVENANCE.md has the full account.
- 16 Nov: one fix in a Cursor/Grok session (restored table grants after a Supabase
  platform change): supabase/migrations/20261116000003_restore_table_grants.sql.
  Cursor was used after that only as a second-opinion reviewer.
- Art and films: made by the owner for this project, from the owner's own sketches,
  with Google Gemini and Leonardo.Ai.
- Graveyard music: "Flowers of the Forest" (traditional tune), an old out-of-copyright recording.
- Open-source libraries: React, Vite, supabase-js, qrcode, fast-check; weather data from
  Open-Meteo (CC BY 4.0).
- All new for Kiroween 2026: no starter kit or template beyond the Vite React starter.
```

### Bonus prizes
- **Blog Prize:** a public post about Kiro and the build on a third-party site (Medium, dev.to, LinkedIn
  article). It must say it was written for the Kiroween 2026 hackathon and be published before 4 Dec.
  Kiro can draft it from this file.
- **Social Blitz:** a public post that **starts with `#KiroweenHackathon26`**, saying your favourite thing
  about Kiro and how it changed the way you build. It is judged on original thoughts, so write this one
  in your own words.
- Post both on submission day (the idea stays private until then).
