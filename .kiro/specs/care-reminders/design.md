# Kiro - Design: care-reminders

## Pieces
- `public/sw.js`: service worker with `push` (show notification) and `notificationclick` (focus or open `/`). **No caching**, so a new deploy is never hidden by a stale cache.
- `push_subscriptions(id, carer_id, endpoint unique, p256dh, auth, timezone, created_at)`: RLS own rows; grants select/insert/delete to authenticated (explicit, because default grants were removed on 16 Nov).
- `reminder_log(key text primary key, at)`: dedupe; service role only.
- Edge Function `care-reminders` (cron every 15 minutes, `x-cron-secret`):
  1. Eggs ready, not hatched, carer has subscriptions, no `egg-ready:{egg}` log -> push.
  2. For each child with subscriptions: project meters to now with the shared care engine `tick()` (same rules as the phone).
     - Meal/bed: carer-local hour equals the scheduled hour -> key `meal:{child}:{kind}:{local date}`.
     - Empty bar: key `empty:{child}:{bar}:{child.last_tick_at}` (a new care action changes `last_tick_at`, which re-arms it).
  3. Send with `npm:web-push`; delete subscription on 404/410.
- `notify-ready-eggs` skips eggs whose carer has a subscription (one message, not two).

## Keys
VAPID pair generated locally by Kiro (`web-push generate-vapid-keys`). Private key piped straight into `supabase secrets set` (never printed or saved). Public key committed in `src/lib/push.ts`.

## Tests
Unit: reminder decision function (meal hour match across timezones, empty-bar dedupe key). Live: function returns 401 without secret, 200 with; a real push is tested on the owner's Android phone.
