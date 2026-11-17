# Kiro - Tasks: public-feed

- [x] T1 Migration: `check_ins.action`, `carers.show_in_feed`, `feed_blocklist`, `public_feed()`, `set_show_in_feed()`; grants; SQL test in rollback
- [x] T2 `pushCheckIn` sends the action; `photo-treat` records `photo_treat`
- [x] T3 Sentence builder + tests
- [~] T4 `BroodFeed` on the mother page; tick box on claim form and care screen
- [ ] T5 Owner test: two Hagglings, both appear; untick one, it disappears

Status 17 Nov: migration live, 7 SQL checks pass (collapse, weather hidden, no email or carers.display_name, opt-out hides past lines, browser cannot fake a Photo Treat, blocked word hides line) + all regressions. Public call with only the publishable key works; anonymous read of check_ins returns nothing. Sentence builder 2 tests. Feed on the mother page and tick boxes built; owner test pending (T5). Existing check-ins have no action, so the feed starts empty and fills from the next care action.
Legend: [x] verified, [~] built, phone test pending.
