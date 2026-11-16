# Tech

## Repository
```
apps/mother/            Vite + React + TypeScript. Mother `/` and nests `/{slug}`.
apps/phone/             Vite + React + TypeScript. Imports mother source for now.
packages/care-engine/   (planned, sync-conflict T1) pure care rules shared by every surface.
supabase/               migrations/ (source of truth), schema.sql (generated), functions/.
tools/weather-mcp/      (planned, weather-mood T1) dev-time MCP server for Kiro only.
docs/                   art, PROVENANCE.md.
.kiro/                  steering, hooks, specs, settings. Committed. Never in .gitignore.
```
Pi, extension and QNX are parked and out of this repo for Kiroween.

## Stack
Vite + React + TS | Supabase (Auth email OTP, Postgres + RLS, Edge Functions, pg_cron) | Resend email | Cloudflare Pages + DNS | Open-Meteo weather.

## Rules
- Highlands palette: moss, peat, thistle, tartan. No flat SaaS grey, no purple-on-white defaults.
- Mother first viewport: brand, one headline, one CTA, atmosphere. Care never renders on `/`.
- One care engine. Do not copy decay or care rules into a second place.
- Database changes are numbered files in `supabase/migrations/`. `schema.sql` is generated, never hand-edited.
- Work spec-first: requirements, design, tasks, approval, then code. Commit messages name the spec and task (`weather-mood T4: ...`).
- Disclose pre-existing code: see `docs/PROVENANCE.md`.
- Security rules: `security.md` always applies.

## Sync (see sync-conflict spec)
Cloud mother is source of truth for identity and traits. Meters: whole block from the snapshot with the later timestamp; tie goes to the cloud. Scrapbook and applied weather slots merge as unions. Merge first, then tick.
