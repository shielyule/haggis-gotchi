# Kiro - Design: public-feed

## Data
- `check_ins.action text` (nullable; `feed|cuddle|walk|treat|clean|photo_treat|weather`). `pushCheckIn` sends the action; `photo-treat` writes `photo_treat`. Weather check-ins never appear in the feed.
- `carers.show_in_feed boolean not null default true`; RPC `set_show_in_feed(boolean)` (owner).
- Function `public_feed()` (security definer, `anon` + `authenticated` execute):
  - joins `check_ins` -> `children` (Haggling name) -> `eggs.answers->>'displayName'` (carer name; never `carers.display_name`, which defaults to the email's first part)
  - filters `show_in_feed`, action not null and not `weather`, last 48 hours
  - collapses repeats (same carer, Haggling, action within 10 minutes) with a window function
  - returns `carer_name, haggling_name, action, at`, limit 10
  - blocked-word list in a small table `feed_blocklist(word)` (service-role managed)

## UI
- `MotherApp` "Scrapbook" block becomes `BroodFeed`: polls `public_feed` every 30 s; "Fred just fed Harry · 2 min ago".
- Claim form: tick box (default on). Care screen: same toggle under reminders.

## Tests
SQL: opt-out hides past events; email never returned; repeats collapse; weather excluded; anon can call the function but cannot select `check_ins`. Unit: verb sentence builder.
