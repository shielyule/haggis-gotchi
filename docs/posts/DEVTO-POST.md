---
title: "Building Haggis-gotchi with Kiro: Specs, Property Tests, and a Wee Beastie That Feels the Haar"
published: false
description: "A Scottish folklore pet that feels your real weather, built spec-first with Kiro for the Kiroween 2026 hackathon: 17 specs, 62 property tests, and an AWS quota of zero."
tags: kiro, hackathon, testing, webdev
cover_image: https://haggisgotchi.com/og/douce.jpg
canonical_url: https://shielyule.co.uk/2026/11/26/building-haggis-gotchi-with-kiro-specs-property-tests-and-a-wee-beastie-that-feels-the-haar/
---

*Written for the Kiroween 2026 hackathon. First published on [shielyule.co.uk](https://shielyule.co.uk/2026/11/26/building-haggis-gotchi-with-kiro-specs-property-tests-and-a-wee-beastie-that-feels-the-haar/).*

{% youtube CC7yj3gtvZY %}

Tamagotchis used to live in your pocket and croak in a drawer like a forgotten banana. They never kent it was pishing down, that your morning had gone pear-shaped, or that there was a chunk of tablet sitting right next to your keyboard. I wanted a wee beastie that actually notices the world outside your window, and Scotland already had the ideal candidate: the wild haggis, which every bairn in the country is solemnly told has longer legs on one side so it can only run one way round a hill. One slip and it's rolling straight to the bottom.

Haggis-gotchi is what came out the other end. A wee Haggling hatches from an egg on your phone, lives for about six weeks, reacts to your real local weather, keeps a diary, and gets a headstone in the mother's kirkyard when it finally heads off to the big glen in the sky. It's live at [haggisgotchi.com](https://haggisgotchi.com), and the whole caboodle, including every Kiro spec, steering file and hook, is at [github.com/shielyule/haggis-gotchi](https://github.com/shielyule/haggis-gotchi).

This is the technical post-mortem: what worked, what went sideways like a Haggling on icy grass, and how Kiro changed my day-to-day engineering workflow.

## What it actually does

- **Claim an egg on your phone.** It's a Progressive Web App, so you install it straight from the browser with zero app-store faffery. A single 6-digit email code gets you in.
- **A birth story.** Answer a few wee questions (favourite weather, a family saying) to seed a story, then slide across six Scots temperaments, from *Douce* (mild-mannered and polite) to *Fair Wud* (away with the fairies and looking for a scrap). Twenty seconds later it hatches with its own short film.
- **Care.** Feed it, cuddle it, take it for a walk, clean up after it, put it to bed, play **Haggis Run** (guess which way it's legging it round the hill), or give it a telling-off, fairly or completely unfairly, when it gets up to mischief.
- **Real weather.** Three times a day, local forecast data shifts its mood. Every temperament reacts differently: Douce loves a soft rain, Skeigh gets jumpy at thunder, Fair Wud thrives in a proper gale, and every Haggling loves the haar (that cold coastal sea mist that creeps in and makes everything damp and atmospheric).
- **Photo Treat.** Snap a picture of something properly Scottish (tablet, shortbread, tartan, heather, bagpipes, a can of Irn-Bru) and computer vision checks it. Every meter gets a boost. Hold up something random instead and it'll give you its honest, unfiltered opinion on what it's looking at.
- **Growing up.** It progresses through Baby, Child, Teen, Adult and Old stages, unlocking fresh artwork and films along the way, seasonal outfits, and stage-specific quirks (teenagers won't be seen dead getting cuddled in public; older legs prefer a gentle amble rather than a sprint).
- **A daily diary.** Every evening, an AI writes a diary entry in the Haggling's own voice based on what actually happened that day. The scrapbook keeps every single page for posterity.
- **A daily folklore riddle.** Kelpies, selkies, the Callanish Stones: proper mythical brain-teasers rather than pub-quiz trivia.
- **The send-off.** After around six weeks: an epitaph written from how you looked after it, a stone in a painted isometric kirkyard, and an optional wee ghost if it's not quite ready to leave the blether.

## Architecture

```
 Phone (PWA, "home device")          Supabase                          Desktop "mother" page
 ─────────────────────────           ─────────────────────────         ──────────────────────
 React + Vite                ◄────►  Postgres + row-level security ◄─► the brood, public
 shared care engine                  Edge Functions (Deno)              scrapbook, painted
 Web Push service worker             pg_cron jobs:                      isometric kirkyard
                                       reminders every 15 min
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

One core invariant governs state: a Haggling is never cloned. Each one belongs to a home device; other devices can spectate, and an explicit "Move here" action transfers ownership cleanly. That rule came out of a mid-build pivot, which I'll get to shortly.

## One care engine, everywhere

The best architectural call in the whole build was isolating all care mechanics inside a single pure TypeScript package (`packages/care-engine`) with zero DOM, browser or database dependencies. The PWA imports it on the client, Supabase Edge Functions import the exact same modules in Deno, and the test suite runs them under Node. Tweak a constant in `rules.ts` and every execution surface stays locked in step.

Continuous time drives the simulation. Between visits, a Haggling's meters decay deterministically:

```
hunger(t) = max(0, h0 − 9 · t · w · s)
```

where `t` is awake hours elapsed, `w` is the temperament multiplier (for instance, 1.15 for wilder temperaments, so a Radge gets the munchies quicker than a Douce), and `s` is the life-stage modifier. While asleep, hunger decays at half rate and energy recovers. Skipping breakfast while hungry dings Health XP, whereas Life XP is monotonic: it only ever climbs and drives a D&D-style level progression.

When an offline phone syncs back up with cloud state, reconciliation follows a deterministic rule from the `sync-conflict` spec:

> WHEN two snapshots meet, THE SYSTEM SHALL keep the whole **meter set** from the snapshot with the later `updated_at`. IF `updated_at` is equal, THEN the mother (cloud) snapshot SHALL win.

Scrapbook entries and applied weather slots merge as set unions, so neither side quietly drops memories or weather events.

## Spec-first with Kiro

Let's not pretend the timeline was a straight line from day one. Kiro hackathon credits arrived later than I hoped, so the initial slice (the mother page, auth flow and basic care loop) was prototyped elsewhere first. Once the credits came through on 16 November, step one in Kiro was a proper gap analysis: reconciling the existing code against rewritten specs and ticking tasks only where reality matched the claim. All of that is logged in `docs/PROVENANCE.md`.

After that reset, new work started as a spec under `.kiro/specs/` (17 specs in total), each structured around three artefacts:

1. **requirements.md**: concise, testable EARS statements (WHEN … THE SYSTEM SHALL …).
2. **design.md**: module boundaries, data shapes and, once property testing clicked, explicit correctness properties.
3. **tasks.md**: granular implementation steps checked off only after verification, with commits referencing the spec and task.

Where spec-first really paid off wasn't greenfield typing; it was change management. Shifting the age rating to 18+ or deciding riddles should be strictly hand-authored went into the requirement with a date and rationale first, then propagated into implementation and tests. Six months down the line, I won't be scratching my head wondering why a guard exists.

## Steering: teaching Kiro from mistakes

Steering files (`.kiro/steering/`) act as persistent project instructions injected into Kiro's context. I ended up with six: product, technical architecture, Scottish folklore voice, security, property testing, and `owner-instructions.md`.

`owner-instructions.md` exists because of a classic "two hours of your life you aren't getting back" afternoon. On 16 November, I followed a Kiro setup guide for locking down a cron endpoint with a secret, and every invocation hit "server not configured". After two speculative workarounds went nowhere, the root cause turned out to be a platform default change on Supabase's side from 30 October (new projects no longer receiving automatic table grants), which static assumptions missed.

We documented the incident and codified a standing rule. Any operational guide Kiro drafts for me now has to:

- check the relevant provider's changelog over the last six months first;
- run every read-only inspection command it can before asking me to click through dashboards;
- present one action per step, with explicit "You should see" and "If you see something else" branches;
- state clearly whether Kiro actually verified the steps.

Turning a painful one-off hiccup into a repeatable steering constraint is easily one of the highest-leverage habits in the repo.

## Hooks

I configured four hooks in `.kiro/hooks/` to enforce guardrails automatically on events:

- **secret-guard** (`PreToolUse`): blocks file writes matching credential or token patterns (JWTs, Resend API keys, AWS access key IDs, Supabase service-role keys), so secrets stay in environment and Vault configuration rather than source files.
- **domain-language guard**: runs after edits to keep product copy aligned with the Scottish care voice and free of stray crypto/web3 jargon.
- **schema-regen reminder**: triggers after migrations as a nudge to regenerate `schema.sql` and review row-level security policies.
- **properties follow requirements**: watches `requirements.md` edits and triggers an agent pass to update correctness properties and tests, without weakening invariants just to get green ticks.

```json
{
  "name": "Properties follow requirements",
  "trigger": "PostFileSave",
  "matcher": "\\.kiro/specs/.+/requirements\\.md$",
  "action": {
    "type": "agent",
    "prompt": "A spec's requirements.md was just changed. ... Never weaken a property to make it pass."
  }
}
```

## MCP: a custom weather server

To keep weather tuning grounded in actual engine numbers rather than guesswork, I built a small MCP server (`haggis-weather`) exposing three tools:

- `get_current_weather`
- `classify_weather` (mapping Open-Meteo readings into twelve Scottish weather buckets, from *dreich* to *haar*)
- `weather_effect` (computing how a given temperament responds)

When iterating on mood curves, Kiro could query `weather_effect` directly to see how a Radge behaves under hot sun versus sideways rain, instead of eyeballing values. I also wired up the AWS documentation MCP server while integrating Rekognition.

## Property-based testing: the part that surprised me

Example-based unit tests are great at checking the scenarios you anticipated, like feeding a Haggling at 50 hunger and asserting it rises to 78. Property-based testing with [fast-check](https://fast-check.dev) flips that around: you declare an invariant across arbitrary inputs, let the generator hammer edge cases, and let shrinking find the minimal failing input when something breaks.

Kiro translated the EARS requirements into 62 properties. Here's the shape of one checking monotonic Life XP:

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

`steps` is a random mix of ticks, care actions, Photo Treats and weather over random times. On the initial run, 38 properties passed and 7 failed. A few of the real bugs it flushed out:

**Frozen bars while watching the screen.** With the care view open, the client re-ticks every 30 seconds. Rounding meters to integers on each tick meant a tiny 30-second hunger delta (around −0.075) rounded right back to zero, while "hungry" and "messy" mood penalties were being applied per tick rather than per hour. In practice, a fed Radge with the app closed for two hours dropped from 80 to 59 hunger, whereas keeping the screen open left it stuck at 80, and a hungry one lost 5 Mood over 30 minutes closed versus 60 with the screen open. Coarse-grained example tests missed it completely; a sampling-frequency invariance property nailed it on the first counterexample. The fix: preserve floating-point precision inside the engine, round only at display and persistence boundaries, and prorate penalties per hour.

**Breakfast judged in UTC.** Evaluating local clock hours on the host environment meant a client device in one time zone and a server job running in UTC could disagree on morning windows, risking unfair Health XP penalties at odd hours. Passing the carer's time zone explicitly into the engine, and testing across multiple time zones, closed that gap.

**A Haggling named "00000".** A later CI run failed on iteration 248 of a newly added property. Our AI output filter rejects long digit sequences to prevent phone-number leakage, but it didn't exempt the Haggling's own name, so a pet named with digits couldn't receive generated lines. Purely random inputs caught a case no human test author would have thought to type.

**Pronoun slips in AI output.** Hagglings default to they/them unless given another identity. An early live Gemini response came back with "he's bouncin aff the walls". Tightening the prompt and output validator exposed sneaky name-scrubbing edge cases when names were single characters or punctuation ("t", "s", "-"), where naive string stripping turned "Another" into "ano her" or clipped "she's".

Across the suite, property tests surfaced 11 genuine issues. They run in GitHub CI and during the Cloudflare build, so broken rules don't slip into production, backed by a steering rule requiring new specs to declare properties up front and the hook keeping them aligned.

## Photo recognition: reading the evidence

Photo Treat resizes an image on the client and calls Amazon Rekognition (object labels plus text detection), passing the results into a pure classification function without storing the raw photo. Rules are derived from captured Rekognition fixtures rather than guesswork.

Irn-Bru was a textbook example. Sideways or angled cans often confuse text recognition on the main logo (one test shot came back reading "BAN URN", which sounds like a punk band from Cumbernauld rather than Scotland's other national drink). However, the tagline "ORIGINAL AND BEST" was consistently detected at 98–100% across orientations, so pairing that text match with a drink-container label gave a reliable rule that doesn't falsely trigger on cola or orange-soda controls.

Tablet (the dangerously sweet Scottish confection, not an iPad) was added for filming, where commercial brand logos can't appear. Across multiple angles, Rekognition reliably read "Tablet" at ≥99.6% alongside sweet/candy labels, so requiring both, while rejecting hardware/device labels, keeps actual tablets from masquerading as confectionery.

## AI words, fallback first

Diary entries and "What's that?" photo reactions use generative AI, under a strict rule from day one: core gameplay never depends on AI availability. Every generation path follows the same contract:

- **Bounded inputs only:** the Haggling's name and temperament, weather bucket, nearest town (never exact coordinates), care summary, or detected photo labels (never raw images or people).
- **Post-generation validation:** length bounds, presence of the Haggling's name, blocklists, and checks against URLs, emails, long digit runs or unintended pronouns.
- **Deterministic fallback:** if the provider is down, exceeds a 10-second timeout, hits a 400-call daily cap, triggers a safety filter, truncates or fails validation, the app falls back cleanly to pre-written lines.
- **Sanitised telemetry:** failure reason and status code only.

That fallback design got stress-tested almost immediately. I initially wired the text generation path to Amazon Bedrock (Amazon Nova Lite in eu-west-2), and live calls failed right out of the gate. Once default client retries (burning around 24 seconds) were bypassed, the underlying error was `429 ThrottlingException: Too many tokens per day`, on the very first call from a brand-new account. Service Quotas showed a daily token quota of 0 marked non-adjustable, and support responses couldn't unblock it in time for the hackathon window.

Fourteen calls, zero successes, and players didn't see a single broken screen, because every call fell back to written lines. After two days I switched generation over to Google Gemini (paid tier), which responded in roughly a second. Because Gemini's terms require an 18+ service, I updated the app's age gate from 13+ to 18+ that same afternoon. The full incident log (`docs/INCIDENT-2026-11-23-aws-bedrock-quota.md`) became another steering lesson: probe every external service with a real call on day one before building features on top of it.

Riddles went in the opposite direction. While Gemini generated fluent riddles, one conflated two distinct folklore legends, and automated structural checks can't verify mythological accuracy. So the 24 riddles are hand-authored, one per topic, and fact-checked by hand.

## Security and privacy

Even when a project starts with a bit of silliness, real user emails and state mean taking security seriously:

- **Row-level security** enabled across every table, with explicit `WITH CHECK` clauses on update policies, backed by database tests verifying cross-carer isolation across eggs, Hagglings and scrapbooks.
- **Egg claiming** routed through a single Edge Function protected by Cloudflare Turnstile, strict schema/length/4 KB payload validation, and hashed rate limits (3 claims per email per day, 10 per connection per hour).
- **Scheduled jobs** invoke Edge Functions using a secret stored in Supabase Vault and verified with constant-time comparison.
- **Location privacy:** coordinates are quantised to 0.1° (about 11 km) on the client before transmission or storage.
- **HTTP hardening:** strict Content Security Policy, HSTS, framing restrictions and permissions-policy headers.
- **Account deletion:** full cascading removal starting from the auth user.
- **Database migrations:** numbered SQL migrations exercised inside rolled-back transactions, preceded by a control check expected to fail, before applying.

## The pivot

Midway through, testing the end-to-end flow on an actual phone made one thing painfully obvious: it was too clunky. Hatching on the desktop mother page and transferring to a phone via a second sign-in and claim code meant juggling multiple codes and emails just to look after a virtual pet you're meant to check in on a few times a day.

Moving to a phone-first model (install from the mobile browser, one email code, and single "home device" ownership so Hagglings aren't duplicated) fixed the ergonomics. The desktop mother page shifted to its rightful role: surveying the brood, browsing the public scrapbook and strolling through the kirkyard (`docs/PIVOT-2026-11-17-phone-first.md`). Testing the real mobile loop earlier would have saved a lot of friction.

## What I'd do differently

- **Smoke-test every hosted service on day one.** One live call would have caught the Bedrock zero-quota wall before three features were wired up to it.
- **Write correctness properties alongside specs from the start.** The nastiest timing bug hid inside code that passed conventional example tests for a week.
- **Keep honest engineering notes as you go.** Incident logs, pivot notes and provenance records proved just as valuable to future-me as to anyone reading the repo.

## By the numbers

- 17 specs, 6 steering files, 4 hooks, 2 MCP servers
- 184 automated tests (62 property-based), catching 11 real issues
- 10 Edge Functions, 20 database migrations, 9 scheduled jobs
- 6 temperaments × 5 life stages of original art, 36 films, 30 seasonal outfits, 24 hand-written riddles
- 1 Bedrock daily token allowance of 0

## Try it

- 🥚 Claim an egg: [haggisgotchi.com](https://haggisgotchi.com) (works great on an Android phone)
- 🎬 Demo video: [youtu.be/CC7yj3gtvZY](https://youtu.be/CC7yj3gtvZY)
- 💻 Repo, specs, steering and hooks: [github.com/shielyule/haggis-gotchi](https://github.com/shielyule/haggis-gotchi)

Built for the Kiroween 2026 hackathon with [Kiro](https://kiro.dev). Artwork started from my own sketches, alongside Google Gemini and Leonardo.Ai. #KiroweenHackathon26
