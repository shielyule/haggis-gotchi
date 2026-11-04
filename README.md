# Haggis-gotchi

A Scottish folklore Tamagotchi for [Kiroween 2026](https://kiroween.devpost.com/) — **Frankenstein** category.

Cloud **mother** births eggs. Kids live on phone / browser extension. An optional **Raspberry Pi** is a second body for the same child (bonus unlock), not a required stage.

**Spine:** care + brood + sync. Not crypto. Not a world editor. Not an RPG quest map.

## Repo layout

```
.kiro/                 # specs, steering, hooks — required for Kiroween (never gitignore)
apps/mother/           # Cloud mother web stub (Vite + React + TS)
docs/art/              # Character + UI reference (look & feel only)
```

## Run the mother stub

```bash
cd apps/mother
npm install
npm run dev
```

## Kiro usage (build as we go)

- **Steering:** `.kiro/steering/` — product rules, Scottish tone, tech stack
- **Specs:** `.kiro/specs/brood-sync`, `.kiro/specs/birthing-ritual`
- **Hooks:** `.kiro/hooks/` — domain language guard
- **MCP (next):** weather for rainy-day / storm happiness
- **Surfaces:** start with Kiro IDE; CLI / Crew optional later

The Devpost “how we used Kiro” write-up will be written from this trail at submission time — not invented up front.

## Scope fence (reign-in)

**In for the entry:** signup → ~30 min birth story → Baby care (Scottish verbs) → mother check-ins → fixed span / scrapbook / graveyard → film one Pi pair.

**Out until after entry:** adventure maps, “defeat brambles,” leaderboards, full shop/gacha, dating, Game of Life careers, multi-folklore mothers, merch store.

UI boards in `docs/art/` set **mood and costume language** only. Extract face, meters, feed/skin slots, mother chrome — not the whole RPG.

## License

MIT — see [LICENSE](./LICENSE).
