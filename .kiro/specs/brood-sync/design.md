# Design: brood-sync

## Entities

- `Mother` — cloud record; gen-zero Scottish
- `Egg` — pending birth; linked to signup answers + story template
- `Child` — id, traits, lifespan start/end, culture pack
- `Surface` — phone | extension | pi; many surfaces → one child
- `CheckIn` — timestamped vitals + events

## Flow

```
Signup → Egg (waiting ~30m) → Hatch(traits↓) → Child on Surface
                                      ↑
                              CheckIn(vitals↑)
```

## API sketch (stub first, local JSON ok)

- `POST /eggs/claim` — create egg from signup
- `GET /eggs/:id` — status + birth story progress
- `POST /eggs/:id/hatch` — issue child + traits
- `POST /children/:id/check-in` — vitals
- `POST /children/:id/surfaces` — pair Pi / second client
- `GET /mother/brood` — list children, scrapbook, graveyard

MVP may implement these as in-memory or localStorage in `apps/mother` until a backend lands.

## Pi surface

Same `Child` id. Bonus: hearth UI, clan drip while paired. Network loss: local decay continues; next check-in reconciles.
