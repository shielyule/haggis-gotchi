# Blog post (draft, about 2,700 words)

**Before publishing:**
- The **Bonus Blog** prize needs a public post on a third-party site (dev.to, Medium, Hashnode or a LinkedIn
  article) that **says it was written for the Kiroween 2026 hackathon** (the first line does) and is published
  before **4 Dec 2026, 2:00pm PT**. Put the URL on the Devpost form.
- Make the GitHub repo public first, then check every link. Replace `[YOUTUBE LINK]`.
- It is written in your voice. Read it through and change anything that isn't how you'd say it.
- On dev.to, the code blocks keep their formatting; on LinkedIn articles, they don't, so dev.to or Medium is better.

---

# Building Haggis-gotchi with Kiro: specs, property tests, and a pet that feels the rain

*Written for the Kiroween 2026 hackathon.*

Tamagotchis lived in your pocket and died in a drawer. They never knew it was raining, that you'd had a bad
day, or that there was a bit of tablet on the desk. I wanted a pet that notices your world, and Scotland
already had the perfect creature: the wild haggis, which (every Scottish child is told) has longer legs on one
side, so it can only run one way round a hill.

Haggis-gotchi is the result. A wee Haggling hatches from an egg on your phone, lives for about six weeks,
reacts to your real local weather, keeps a diary, and gets a stone in the mother's kirkyard when it goes to
the glen. It's live at [haggisgotchi.com](https://haggisgotchi.com), and the code, including every Kiro spec,
steering file and hook, is at [github.com/shielyule/haggis-gotchi](https://github.com/shielyule/haggis-gotchi).

This post is about how it was built: what went well, what broke, and what Kiro changed about the way I work.

## What it does

- **Claim an egg** on your phone. It's a web app, so it installs from the browser with no app store. One
  6-digit email code signs you in.
- **A birth story.** A few questions (your favourite weather, a family saying) seed a story, and a slider
  picks one of six Scots temperaments, from *Douce* (gentle) to *Fair Wud* (completely wild). Twenty seconds
  later it hatches with its own film.
- **Care.** Feed, cuddle, walk, clean, put to bed, play **Haggis Run** (guess which way it runs round the hill),
  and tell it off, fairly or unfairly, when it gets up to mischief.
- **Real weather.** Three times a day the forecast for your rough area changes its mood. Each temperament feels
  it differently: Douce loves rain, Skeigh hides from thunder, Fair Wud lives for storms, and every haggis loves
  the haar.
- **Photo Treat.** Snap something Scottish (tablet, shortbread, tartan, heather, bagpipes, an Irn-Bru can) and
  image recognition checks it. Every bar fills. Show it anything else and it tells you what it thinks.
- **It grows up** through Baby, Child, Teen, Adult and Old age, with new art and films at each stage, seasonal
  costumes, and life-stage rules (teens refuse cuddles in public; old knees prefer gentle walks).
- **A diary.** Every night an AI writes a page in the Haggling's voice from what really happened that day. The
  scrapbook book keeps every page, ever.
- **A daily folklore riddle**: kelpies, selkies, the Callanish Stones.
- **The end.** After six weeks: an epitaph written from how it was treated, a stone in a painted isometric kirkyard,
  and an optional wee ghost.

## The architecture

```
 Phone (PWA, "home device")          Supabase                          Desktop "mother" page
 ─────────────────────────           ─────────────────────────         ──────────────────────
 React + Vite                ◄────►  Postgres + row-level security ◄─► the brood, public
 shared care engine                  Edge Functions (Deno)              scrapbook, 3D kirkyard
 Web Push service worker             pg_cron jobs:                      (painted isometric views,
                                       reminders every 15 min           day and night, hotspots)
                                       weather 3x a day
                                       lifecycle every 5 min
                                       diary hourly (each carer's 9pm)
                                     Vault (cron secret)
        │                                   │
        ▼                                   ▼
 Cloudflare Pages (+ a Pages        Amazon Rekognition (photo labels)
 Function for share-card previews)  Google Gemini (diary, photo reactions)
 Cloudflare Turnstile               Open-Meteo (weather)   Resend (email)
```

A Haggling is never copied. Each one has a **home device**; other devices can watch it, and "Move here" hands
it over. That rule came out of a pivot, which I'll come back to.

## One care engine, everywhere

The most important decision was putting every care rule in one pure TypeScript package
(`packages/care-engine`) with no browser or database code in it. The phone runs it, the Edge Functions run it
(Deno imports the same files), and the tests run it under Node. Change a number in `rules.ts` and every surface
changes together.

Time drives everything. A Haggling's bars fall continuously between visits:

```
hunger(t) = max(0, h0 − 9 · t · w · s)
```

where `t` is awake hours, `w` is the temperament factor (1.15 for the wild ones, so a Radge gets hungry faster
than a Douce) and `s` is the life-stage factor. Asleep, hunger falls at half speed and energy comes back.
Missing breakfast while hungry costs Health XP; Life XP only ever goes up and sets a D&D-style level.

When the phone and the cloud both have a copy (say, the phone was offline), they merge by one rule from the
`sync-conflict` spec:

> WHEN two snapshots meet, THE SYSTEM SHALL keep the whole **meter set** from the snapshot with the later
> `updated_at`. IF `updated_at` is equal, THEN the mother (cloud) snapshot SHALL win.

Scrapbook entries and applied weather slots are unions, so nothing either side wrote is ever lost.

## Spec-first with Kiro

I'll be honest about the start. Kiro's hackathon credits took longer to arrive than I had, so the first working
version (the mother page, sign-in, the first care loop) was built in another tool. When the credits landed on
16 November, the first thing I did in Kiro was a gap analysis, then rewriting the early specs to describe the code
that actually existed, with tasks ticked **only** if they were true. That's all documented in the repo
(`docs/PROVENANCE.md`).

From then on, every feature started as a spec in `.kiro/specs/`: 17 in total. Each one has three files:

1. **requirements.md**, in EARS style ("WHEN … THE SYSTEM SHALL …"). These are short and testable.
2. **design.md**: the files, the data, and (later) the *correctness properties*.
3. **tasks.md**: a checklist, ticked only when verified. Commits name the spec and task.

The difference from "vibe coding" showed up most when things changed. When I decided the game should be 18+, or
that riddles should be hand-written only, the change went into the requirement first, with the date and the
reason, and then into the code and tests. Months from now I'll still know *why* every rule is the way it is.

## Steering: teaching Kiro from mistakes

Steering files (`.kiro/steering/`) are standing instructions Kiro reads on every task. I have six: product,
tech, Scottish folklore voice, security, property tests, and one called `owner-instructions.md`.

That last one exists because of a bad afternoon. On 16 November Kiro wrote me a setup guide for locking a cron job
behind a secret. I followed it, and everything failed with "server not configured". Two guessed fixes later, I'd
lost two hours. The real cause: Supabase had changed a platform default on 30 October (new projects stopped
getting automatic table grants), and the guide didn't know.

We wrote an incident record, then a steering rule. Every guide Kiro writes for me now must:

- check the provider's changelog for the last six months first;
- run every read-only check it can itself before asking me to click anything;
- give one action per step, with "You should see" and "If you see something else";
- say plainly whether Kiro tested it.

It hasn't happened again. That, more than anything, is what steering is for: turning one failure into a rule
that changes every future answer.

## Hooks

Hooks (`.kiro/hooks/`) run automatically on events. I have four:

- **secret-guard** (`PreToolUse`): blocks any file write that contains something shaped like a key (JWTs,
  Resend keys, AWS access key ids, the service-role key). Secrets go to Supabase secrets, never into code.
- **domain-language guard**: after edits, keeps the Scottish care voice in product copy (and keeps crypto-speak out).
- **schema-regen reminder**: after a migration, regenerate `schema.sql` and check row-level security.
- **properties follow requirements**: when any `requirements.md` changes, update that spec's correctness
  properties and their tests, and run them.

```json
{
  "name": "Properties follow requirements",
  "trigger": "PostFileSave",
  "matcher": "\\.kiro/specs/.+/requirements\\.md$",
  "action": { "type": "agent", "prompt": "A spec's requirements.md was just changed. ... Never weaken a property to make it pass." }
}
```

## MCP: a weather server of our own

I wrote a small MCP server, `haggis-weather`, with three tools: `get_current_weather`, `classify_weather` (turns
an Open-Meteo reading into one of twelve buckets, from *dreich* to *haar*) and `weather_effect` (what a given
temperament feels). While designing the weather reactions, Kiro could ask it "what would a Radge Haggling feel on
a hot day?" and get the real numbers from the engine, instead of guessing. I also used the AWS documentation MCP
server for the Rekognition integration.

## Property-based testing: the part that surprised me

Example tests check the cases you thought of: "feed a Haggling with Hunger 50 and Hunger becomes 78."
Property tests state a rule that must hold for **every** case, then let a library
([fast-check](https://fast-check.dev)) invent hundreds of random cases and try to break it. When one fails, it
shrinks the failure to the smallest example.

Kiro turned the EARS requirements into 62 properties. For example, from "Life XP SHALL never decrease":

```ts
test('P2 Life XP never goes down (photo-care R5.4)', () => {
  fc.assert(
    fc.property(world, ([at, temp, stage, haggling, steps]) => {
      run(haggling, temp, stage, steps, at, (prev, next) =>
        assert.ok((next.lifeXp ?? 0) >= (prev.lifeXp ?? 0)))
    }),
  )
})
```

where `steps` is a random mix of ticks, care actions, Photo Treats and weather, over random times. On the first
run, 38 held and 7 failed. Some of what they found:

**The bars froze while you watched.** With the care screen open, the phone re-ticks every 30 seconds. Each tick
rounded the bars to whole numbers, and a 30-second drop (Hunger −0.075) rounds back to nothing. So the clock moved
on but the bars didn't. Meanwhile, the "hungry" and "messy" Mood penalties were applied *per tick* instead of per
hour. Measured: a fed Radge with the app closed for two hours went Hunger 80 → 59; with it open, it stayed at 80.
A hungry one lost 5 Mood in 30 minutes closed, and **60** with the app open. Every example test had jumped time in
one big step, so none of them saw it. The property "checking often or rarely gives about the same bars" failed on
its first case. The fix: keep exact fractions inside the engine, round only when showing or saving, and charge the
penalties per hour.

**The server judged breakfast in UTC.** The engine read the hour from whatever machine ran it. On a phone that's
the carer's time; on Supabase it's UTC, so a US judge could lose Health XP for a "missed breakfast" at 3am. A
property that ran the same Haggling under four time zones caught it. The engine now takes the carer's time zone.

**A Haggling called "00000".** Weeks later, GitHub CI failed on run 248 of a property I'd written the day before.
The AI-text safety check blocks long numbers (to stop phone numbers), but it didn't skip the Haggling's own name, so
a Haggling named with digits could never get an AI line. Nobody would have written that test case. The random
inputs found it, and CI stopped the deploy until it was fixed.

**The AI called a Haggling "he".** The game's design is that every Haggling is "they/them" unless they tell you who
they are. The first live Gemini reaction said "he's bouncin aff the walls". We added a rule to the prompt and to the
checker, and as soon as the property tests ran against the new rule, they found three more edge cases in minutes: a
Haggling called "t" (removing the name deleted every t, turning "Another" into "ano her"), one called "s" (hiding the
"she" in "she's"), and one called "-".

In total the properties have found 11 real problems. They run in GitHub CI and **inside the Cloudflare build**, so a
broken rule can't be deployed. A steering file now requires every new spec to list its properties in the design,
and the hook above keeps them in step.

## Photo recognition: reading the evidence

Photo Treat sends a shrunk photo to Amazon Rekognition (two calls: object labels and text), then a pure function
decides which treat it is. The photo is never stored. The rules come from real Rekognition answers saved as test
fixtures, not guesses.

Irn-Bru taught me that. Rekognition often can't read the can's sideways logo ("BAN URN" on one of my photos). But
it read the slogan **"ORIGINAL AND BEST"** at 98-100% in every orientation, so the rule became "that slogan plus a
drink container". Coke and Fanta controls never match.

Tablet (the Scottish sweet, not the computer) was added for the video, because brand logos can't appear on screen.
On my photo, Rekognition read the word "Tablet" at 99.6% or more at four angles and labelled it Sweets or Candy, so
the rule needs both, and any gadget label rules it out, so an iPad never counts.

## AI words, fallback first

The diary and the "What's that?" photo reaction are written by an AI. The design rule from day one: **the game
never depends on it.** Every AI line:

- gets only game facts: the Haggling's name and type, the day's weather, the nearest town (never coordinates),
  the care it had, or the object labels from a photo (never the photo, never people);
- is checked before it's saved: right length, names the Haggling, no blocked words, no links, emails, long
  numbers, or he/she;
- falls back to a written line if the AI is off, slow (10 seconds), over a daily cap of 400 calls, blocked by a
  safety filter, cut off, or fails the checks;
- records *why* it failed (status and error type only).

That rule was tested sooner than I expected. I built the features on Amazon Bedrock (Amazon Nova Lite, in London).
The first live call failed. And the next. The real error, once we'd stopped the AWS client from silently retrying
for 24 seconds, was `429 ThrottlingException: Too many tokens per day`, on the account's first ever call. Service
Quotas showed the daily token quota for Nova Lite at **0**, marked "not adjustable". AWS Support's first reply
declined because the account was new and suggested using "90%" of the existing limit (of zero). The second
acknowledged the hackathon deadline and said the request "may take some time".

Fourteen calls, none successful, and players never noticed, because every one fell back to a written line. After two
days I moved the AI words to Google Gemini (paid tier). The first call worked in about a second. Gemini's terms
require an 18+ service, so the game went from 13+ to 18+ the same afternoon. The whole story, with the evidence, is
in `docs/INCIDENT-2026-11-23-aws-bedrock-quota.md`, along with the lesson Kiro added to its steering: make one real
call from the real account on day one, before building on a service.

The riddles went the other way. Gemini's riddles were well formed, but one mixed up two legends, and a checker can
test a riddle's shape but not its folklore. So riddles are hand-written: 24 of them, one per topic, fact-checked.

## Security and privacy

It's a toy, but it's a real product with real emails, so:

- **Row-level security** on every table, with `with check` on every update policy, and a database test proving one
  carer can't read or change another's eggs, Hagglings or scrapbook.
- **Claiming an egg** goes through one Edge Function: Cloudflare Turnstile, strict validation (only known fields,
  lengths, a 4 KB limit), and rate limits stored as hashes (3 claims per email per day, 10 per connection per hour).
- **Cron jobs** call Edge Functions with a secret kept in Supabase Vault, checked in constant time.
- **Location** is rounded to 0.1° (about 11 km) on the phone before it's stored or sent.
- **Security headers**: a strict Content Security Policy, HSTS, frame blocking, a permissions policy.
- **Delete my account** removes everything, through a cascade from the auth user.
- **Every database change** is a numbered migration, tested inside a transaction that's rolled back, with a control
  run that must fail first, before it's applied.

## The pivot

Halfway through, I tested the original flow on a real phone and hated it. The egg hatched on the desktop "mother"
page and moved to the phone with a second sign-in and a claim code: three codes and two emails for one pet. Each
problem was fixable on its own, but together they made it too fiddly for something you open several times a day.

So we went phone-first: install from the browser, one email code, and the "home device" model so a Haggling is never
copied. The mother page became the place to watch the brood, read the public scrapbook and visit the kirkyard. The
reasoning is in `docs/PIVOT-2026-11-17-phone-first.md`. Test the whole flow on a real phone early. I wish I had.

## What I'd do differently

- **Probe every hosted service on day one.** One real call would have shown the Bedrock zero quota before I built
  three features on it.
- **Write properties from the start**, not after. The worst bug lived for a week in code that "passed its tests".
- **Write the honest record as you go.** The incident records, the pivot note and the provenance file were the most
  useful documents in the repo, for me as much as anyone.

## By the numbers

- 17 specs, 6 steering files, 4 hooks, 2 MCP servers
- 184 automated tests, 62 of them property-based; 11 real problems found by the properties
- 10 Edge Functions, 20 database migrations, 9 scheduled jobs
- 6 temperaments × 5 life stages of original art, 36 films, 30 seasonal costumes, 24 hand-written riddles
- 1 Amazon Bedrock token allowance of 0

## Try it

- 🥚 Get your own egg: [haggisgotchi.com](https://haggisgotchi.com) (best on an Android phone)
- 🎬 The demo video: [YOUTUBE LINK]
- 💻 The code, specs, steering and hooks: [github.com/shielyule/haggis-gotchi](https://github.com/shielyule/haggis-gotchi)

Built for the Kiroween 2026 hackathon with [Kiro](https://kiro.dev). Art from my own sketches, with Google Gemini and
Leonardo.Ai.
