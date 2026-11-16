# Kiro - Design: lifespan-graveyard

## Data
Migration `2026111x_lifespan_graveyard.sql`:
- `children` add: `born_at timestamptz`, `span_ends_at timestamptz`, `departed_at timestamptz`, `ghost_opt_in bool`, `tone text`.
- Trigger on insert sets `born_at = now()`, `span_ends_at = now() + interval '14 days'` (or `4 minutes` when the insert carries `demo = true` from `claim-egg`). Included in the immutable-traits trigger (sync-conflict).
- `graveyard_entries(id, child_id unique, carer_id, name, temperament_id, born_at, departed_at, days_lived, tone, epitaph, stats jsonb, last_pages jsonb)`; RLS own rows.
- Function `depart_due_children()` (security definer): for rows with `span_ends_at <= now()` and `departed_at is null`, set `departed_at`, insert graveyard entry from child + last scrapbook lines, idempotent via unique `child_id`.
- pg_cron: run `depart_due_children()` every 5 minutes.

## Engine (packages/care-engine)
- `tick()`: if `now >= spanEndsAt`, return state with `departed = true`; `applyCare` returns state unchanged when departed.
- `moodDaily: number[]` (last 7 days) in `engine_state`; `toneFor(moodDaily)` pure.
- Scrapbook wording sets for `bright | dim | dark`.
- Epitaph: `epitaph(name, temperament, tone, daysLived, stats)` templates in Scots tone (bright: "Lived loud and was loved." dark: "Mostly remembered the weather.").

## UI
- Nest/phone: countdown "11 days left", tone-based background class.
- On departure: full-screen "final page" with scrapbook, then Keep a ghost? Yes/No.
- Mother `/`: replace the static yard blocks with a real Graveyard list (signed in); empty state kept.
- Ghost: `GhostCard` component, CSS `filter: grayscale(.8) opacity(.7)`; no buttons.

## Demo
`?demo=1` span 4 minutes plus a dev-only "age 10 days" control behind `import.meta.env.DEV`, so the video can show departure, scrapbook and graveyard in under 30 seconds.

## Tests
`toneFor` boundaries (34/35, 59/60); departure idempotent (run twice, one graveyard row); care blocked after departure; immutable `span_ends_at`; ghost has no actions; RLS: other carer sees none.
