# Kiro - Handoff: 3D graveyard ("Haggis Kirkyard") session

For the separate Kiro session building the 3D graveyard. Written 18 Nov 2026 by the
main session. Read this, then the owner's brief, before writing the `graveyard-3d` spec.

## The brief
`/Users/shielyule/Desktop/Haggis-gotchi/Haggis images/Graveyard/Haggis Kirkyard Lore and Games_BRIEF.pdf`
(14 pages, 23 MB: lore, funeral march, scene architecture, underworld shader, InstancedMesh,
overnight burials, Undertaker's Ledger, ghost lore). Do **not** commit the PDF to the repo.

## What already exists (live, tested)

| Thing | Where |
| --- | --- |
| Departure at day 42, once, by the server | Edge Function `lifecycle` (cron every 5 min) |
| One headstone row per departed Haggling | table `graveyard_entries` (owner-only RLS; service role writes) |
| Public list of stones | `rpc('public_graveyard')` -> `name, temperament_id, days_lived, tone, epitaph, departed_at, public_id, ghost` (max 100, newest first, no carer details, honours the public-scrapbook opt-out) |
| Memorial card per Haggling | `/h/<public_id>` |
| Ghost portraits (owner art) | `apps/mother/public/art/haggling-ghost-<temperament>.jpeg`, `ghostPortraitFor()` in `src/data/temperaments.ts` |
| Tone | `bright` / `dim` / `dark` (from the last 7 days of mood) |
| Demo: make a Haggling depart now | demo menu (tap name 5x) -> Skip to the end (demo eggs only) |

## Decisions the owner must make before building (brief vs current product)

1. **One table, not two.** The brief proposes `kirkyard_plots`. A stone row already exists in `graveyard_entries`. Recommendation: add `plot_x`, `plot_z`, `stone_type (1-5)`, `status ('pending_burial' | 'buried')`, `is_watcher`, `sained_count` to `graveyard_entries` in a new migration.
2. **Undertaker's Ledger vs automatic epitaph.** Departure already writes an epitaph. Proposal: the Ledger lets the carer pick a stone type and optionally rewrite the epitaph (60 chars, same name filter as claims) before the midnight burial; if they never open it, the automatic epitaph and stone 1 are used.
3. **"Cause of death".** The product rule is *no early death* (fixed 6-week life). Causes in the brief ("Burst frae Neeps") would be jokey labels, not real causes. Owner to confirm, or drop the field.
4. **Route.** Brief: `/haggis-graveyard`. Earlier proposal: `/graveyard` (already a reserved slug). Pick one; either works with the router in `App.tsx`.
5. **Stack.** Brief assumes Tailwind; this app uses plain CSS (`App.css`). Use CSS, do not add Tailwind. three / R3F / drei / gsap are new dependencies: load them **only** on the graveyard route (`React.lazy` + dynamic import) so the phone app stays light.
6. **3D assets.** Cloudflare Pages limit: **25 MiB per file**, 20,000 files (checked 18 Nov 2026). Keep GLTF models compressed (Draco/meshopt) and small; the whole scene should load on a phone in a few seconds.
7. **"Leave a pinch of salt".** A public write: needs a rate-limited server function (signed-in only, once per stone per carer per day), not a direct table write.

## Working rules for the graveyard session

- Branch `graveyard-3d`; code in `apps/mother/src/graveyard/` and `apps/mother/public/graveyard/`. Spec in `.kiro/specs/graveyard-3d/` (requirements, design, tasks) **before** code.
- Database: new numbered migration files only (full timestamp, e.g. `20261119120000_graveyard_plots.sql`), grants + RLS in the same file, a SQL test that runs in a rolled-back transaction. Do not edit migrations already applied.
- Do not change `lifecycle`, `public_graveyard()` or `graveyard_entries` columns without telling the main session (the mother page and memorial cards read them). Adding columns is fine.
- Steering applies: `security.md`, `owner-instructions.md` (step-by-step guides, test first), `tech.md`.
- The main session merges the branch.

## Data the graveyard needs from the main session (ask, it will add)
- Plot coordinates assigned at burial (if decision 1 is accepted).
- A public `public_graveyard()` that also returns `plot_x`, `plot_z`, `stone_type`, `status`, `is_watcher`, `sained_count`.
