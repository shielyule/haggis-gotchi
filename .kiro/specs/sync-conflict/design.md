# Kiro - Design: sync-conflict

## 1. Shared care engine (fixes the copy-paste)

Today `tickHaggling` (mother) and `tickPhoneChild` (phone) are two copies of the
same decay rules, and `careAction` / `carePhoneAction` are two copies of the care
rules. A fix in one is silently missing from the other, so the same Haggling can
age differently depending on the surface.

New pure TypeScript package, no browser APIs, no Supabase:

```
packages/care-engine/src/
  types.ts     Haggling, EggRecord, ScrapEntry, CareAction
  rules.ts     constants: decay rates, penalty sizes, thresholds
  tick.ts      tick(haggling, temperamentId, nowMs): Haggling
  care.ts      applyCare(haggling, action, now): Haggling
  health.ts    moved from apps/mother/src/lib/health.ts
  merge.ts     mergeHaggling(local, remote): Haggling
  weather.ts   applyWeather(...)  (added by weather-mood)
```

Engine functions are pure: they take a Haggling and return a new one. Storage
wrappers (`storage.ts`) read, call the engine, and write. Apps import it via a
Vite alias `@haggis/care-engine` and `tsconfig` paths (no workspace tooling).

## 2. What "latest timestamp wins" means, step by step

A Haggling's meters are: hunger, mood, energy, mess, healthXp, sick, penalty
clocks. They are coupled (hunger drags mood, mood drags health), so they are
treated as **one block**.

```
local  : hunger 40, mood 55, updated_at 10:05
remote : hunger 72, mood 70, updated_at 10:12
=> winner = remote (10:12 > 10:05). Take the whole block from remote.
   Do NOT take hunger from one and mood from the other.
tie    : cloud wins.
```

Why not newest-per-field: a field merge can produce a Haggling nobody ever saw
(fed on the phone, penalised on the nest, merged into a state neither shows).

After choosing the block, the loser's offline work is not lost: scrapbook lines
and check-in rows are unions, so the story keeps both surfaces' events, even when
the meter block comes from only one.

Edge: if the **local** surface has been offline for hours, its `updated_at` is
old, so remote wins. Then the engine runs `tick()` forward to now so decay for the
offline gap is applied once. Merge first, tick second.

## 3. Merge function

```ts
mergeHaggling(local, remote): Haggling
  winner  = remote.lastTickAt >= local.lastTickAt ? remote : local   // tie -> cloud
  result  = { ...winner }                       // meter block
  result.scrapbook   = unionById(local.scrapbook, remote.scrapbook).sort(byTimeDesc).slice(0, 40)
  result.weatherApplied = union(local.weatherApplied, remote.weatherApplied)
  result.traits      = remote.traits            // immutable: always from cloud
```

Properties to test (fast-check style, random inputs):
1. Idempotent: `merge(a, a) = a`.
2. Commutative except ties: `merge(a, b) = merge(b, a)` when timestamps differ.
3. Monotonic: result `lastTickAt` is `max` of both.
4. Scrapbook ids of the result = union of both inputs (capped at 40, newest kept).
5. Traits never change.
6. Weather slot never applied twice.

## 4. Persistence

Migration `20261116_sync_conflict.sql`:
- `children` add: `health_xp int`, `sick bool`, `engine_state jsonb` (penalty clocks/flags, last clean), `weather_applied text[]`, `updated_at timestamptz`.
- Trigger `children_immutable_traits` raises if `egg_id`, `carer_id`, `temperament_id` change (R6).
- `scrapbook_entries`: upsert by id (no delete-all).
- `pushCheckIn` sends the whole block with `updated_at`; update has `where updated_at <= new.updated_at` (a stale device cannot overwrite a newer cloud state).

## 5. Schema in sync

Cron cannot fix schema drift; it can only hide it. The reliable fix is process:
1. Every change is a file in `supabase/migrations/NNNN_name.sql`.
2. `schema.sql` is produced by `supabase db dump --schema public`, never edited by hand.
3. A GitHub Action on pull request runs the dump against a local Postgres built from migrations and fails if `schema.sql` differs.
4. A Kiro hook (`PostFileSave` on `supabase/migrations/*.sql`) reminds the agent to regenerate `schema.sql`.

## 6. Client flow

```
open app / reconnect / care action
  local = load()
  remote = fetchChild()          (skip if offline)
  merged = mergeHaggling(local, remote)
  merged = tick(merged, now)
  save(merged); push(merged) if merged !== remote
```
