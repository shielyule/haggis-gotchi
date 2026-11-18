# Kiro - Tasks: lifespan-graveyard (v2)

Commit format: `lifespan-graveyard T3: <what>`.

- [x] T1 Span decided 18 Nov: 42 days (6 weeks) with stages; demo fast-forward. Stage content to finish with owner's images.
- [x] T2 Migration live: life dates server-only + immutable, `graveyard_entries` (owner RLS), `public_graveyard()`, memorial `public_haggling()`; 6 SQL checks + all regressions pass
- [x] T3 Engine: `lifeStatus` (stages Baby 0, Child 7, Teen 14, Adult 24, Old age 36, end 42), `toneFor`, `epitaph`; 4 tests
- [x] T4 `lifecycle` function (cron every 5 min): departs due Hagglings once (tone from last 7 days of mood, epitaph, final scrapbook page, headstone, notification), stage-change notifications; demo "next"/"end" for demo eggs only; ghost choice. Live test 18 Nov: throwaway Haggling born 43 days ago departed with a bright epitaph, second run did not duplicate, cleaned up.
- [~] T5 Care screen: stage + days left, stage badge, final page (epitaph, ghost choice, last pages, Claim a new egg, Visit the graveyard); jobs skip departed Hagglings
- [~] T6 Mother page graveyard list (stones, ghosts, memorial links); public card becomes a memorial
- [~] T7 Demo menu: Next stage / Skip to the end (demo eggs only)
- [ ] T8 Stage images: owner making teen/adult/elder images + videos; add to `STAGE_PORTRAITS` in `data/temperaments.ts`
- [ ] T9 3D isometric graveyard (separate spec `graveyard-3d`, reads `public_graveyard()`)

Legend: [x] verified, [~] built, phone test pending.
