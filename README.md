# Haggis-gotchi

A Scottish folklore pet that hatches on your phone, feels your real local weather, keeps a diary, grows up over
six weeks, and gets a stone in the mother's kirkyard at the end. Built spec-first with [Kiro](https://kiro.dev)
for the **Kiroween 2026** hackathon.

🥚 **Play:** [haggisgotchi.com](https://haggisgotchi.com) (best on an Android phone; on a computer it opens the mother page)
🎬 **Demo video:** [YOUTUBE LINK]
📄 **Licence:** MIT, see [LICENSE](./LICENSE) · © Shiel Yule

---

## What it does

- **Claim an egg on your phone.** A web app (PWA): installs from the browser, no app store. One 6-digit email code.
- **A birth story** from your answers, and one of six Scots temperaments: Douce, Skeigh, Ill-trickit, Ree, Radge, Fair Wud.
- **Care:** feed, cuddle, walk, treat, clean, put to bed, **Haggis Run** (a mini-game), and Tell off when it misbehaves.
- **Real weather** three times a day (Open-Meteo, rough area only). Each temperament reacts differently.
- **Photo Treat:** snap tablet, shortbread, tartan, heather, bagpipes or Irn-Bru (Amazon Rekognition) and every bar fills.
  Show it anything else and it reacts in its own words.
- **Six-week life:** Baby, Child, Teen, Adult, Old age, with new art and films at each stage, seasonal costumes,
  and an optional, supportive identity moment at Teen.
- **A nightly diary** written by an AI (Google Gemini) from the day's real weather and care, kept in a scrapbook book.
- **A daily folklore riddle** (24, hand-written and fact-checked).
- **The end:** an epitaph from how it was treated, a stone in a painted kirkyard (`/haggis-graveyard`), and an optional ghost.
- **One pet, never copied:** each Haggling has one home device; others watch, and "Move here" hands it over.

## How Kiro was used

| | Where | What it did |
|---|---|---|
| **Specs** | [`.kiro/specs/`](.kiro/specs) | 17 features, each requirements (EARS) → design (with correctness properties) → tasks, ticked only when verified. Commits name the spec and task. |
| **Steering** | [`.kiro/steering/`](.kiro/steering) | 6 files: product, tech, Scottish folklore voice, security, property tests, and owner instructions (written after a [real incident](docs/INCIDENT-2026-11-16-cron-setup.md)). |
| **Hooks** | [`.kiro/hooks/`](.kiro/hooks) | Secret guard (blocks key-shaped strings), domain-language guard, schema reminder, and "properties follow requirements". |
| **MCP** | [`.kiro/settings/mcp.json`](.kiro/settings/mcp.json) | Our own [`haggis-weather`](tools/weather-mcp) server, and the AWS documentation server. |
| **Property-based tests** | [`docs/PBT-FINDINGS.md`](docs/PBT-FINDINGS.md) | 62 fast-check properties written from the requirements; they found 11 real problems. |

More: the [phone-first pivot](docs/PIVOT-2026-11-17-phone-first.md), the [AWS Bedrock incident](docs/INCIDENT-2026-11-23-aws-bedrock-quota.md),
and [how this repo was built](docs/PROVENANCE.md) (the first version was made in another tool before the Kiro credits
arrived; from 16 Nov 2026 Kiro owns the repo).

## Repo layout

```
apps/mother/          The web app: phone care screen, mother page, scrapbook book, kirkyard (Vite + React + TypeScript)
  functions/          Cloudflare Pages Function: link previews for public share cards (/h/<id>)
packages/care-engine/ All the care rules, pure TypeScript; used by the app, the server and the tests
supabase/
  migrations/         Every database change, numbered (the source of truth)
  functions/          Edge Functions (Deno): claim-egg, photo-treat, diary, riddle, care-reminders,
                      weather-tick, lifecycle, notify-ready-eggs, delete-account, and more
  tests/              Database tests (each run inside a transaction that is rolled back)
  schema.sql          Generated from the live database, for reading only
tools/weather-mcp/    The haggis-weather MCP server
docs/                 Design notes, incident records, guides
.kiro/                Specs, steering, hooks and MCP settings (committed on purpose)
apps/phone/           Retired (17 Nov 2026, phone-first pivot). Kept for the record only.
```

## Run it locally

Needs Node 24.

```bash
npm install                      # repo test tools (fast-check)
cd apps/mother
npm install
cp .env.example .env.local       # fill in your Supabase URL and anon key
npm run dev                      # http://localhost:5173
```

Sign-in, saving, the server jobs and the AI all need a Supabase project.
To set up your own: create a Supabase project, apply `supabase/migrations/` in order, deploy the functions in
`supabase/functions/`, and set their secrets (names are listed at the top of each function).

## Tests

```bash
npm test                         # 184 tests, from the repo root, 62 of them property-based
cd apps/mother && npm run build  # runs the tests first; a failing test stops the build
```

The same tests run in [GitHub Actions](.github/workflows/ci.yml) on every push, and inside the Cloudflare
Pages build, so a broken rule cannot be deployed.

## Stack

| Layer | Choice |
|---|---|
| App | Vite + React + TypeScript, installable PWA, Web Push |
| Hosting | Cloudflare Pages (+ one Pages Function), Cloudflare Turnstile |
| Database and auth | Supabase: Postgres with row-level security, email codes, Edge Functions (Deno), pg_cron, Vault |
| Photo recognition | Amazon Rekognition (labels and text; photos are never stored) |
| AI words | Google Gemini (paid tier), with written fallbacks for every line |
| Weather | [Open-Meteo](https://open-meteo.com) (CC BY 4.0) |
| Email | Resend |
| Tests | node:test, [fast-check](https://fast-check.dev) |

## Privacy

Rough location only (0.1°, about 11 km), photos never stored, public pages off by default, and anyone can delete
their account. See the live [privacy notice](https://haggisgotchi.com/privacy). Haggis-gotchi is for adults (18+).

## Credits

Art and films by Shiel Yule, from her own sketches, with Google Gemini and Leonardo.Ai.
Not affiliated with, or endorsed by, any brand named in the game.
