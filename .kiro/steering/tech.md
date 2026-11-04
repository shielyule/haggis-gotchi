# Tech

## Monorepo

- `apps/mother` — Vite + React + TypeScript. Cloud mother UI.
- Later: `apps/child` (phone/PWA or extension), `device/pi` (Python or Node hearth).

## Rules

- Prefer simple, readable UI. Highlands palette: moss greens, peat browns, thistle purple, tartan accents — not purple-on-white AI-slop defaults, not flat SaaS grey.
- No cards-for-decoration. Mother first viewport: brand, one headline, one CTA (claim egg), atmosphere.
- Keep `.kiro/` committed. Never add it to `.gitignore`.
- Disclose any pre-existing code brought in. Product work starts in this repo during the Submission Period.

## Sync (see brood-sync spec)

Source of truth for brood identity and hatch traits: mother/cloud. Device owns live meters while offline; reconciles on check-in with boring conflict rules (last write wins on meters with timestamps; traits immutable after hatch unless mother event).
