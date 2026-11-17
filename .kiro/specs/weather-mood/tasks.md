# Kiro - Tasks: weather-mood

Depends on `sync-conflict` T1-T3 (shared care engine and merge).
Commit format: `weather-mood T4: <what>`.

- [x] T1 `tools/weather-mcp` + `.kiro/settings/mcp.json`; verify Kiro can call it (R7)
- [x] T2 Use MCP to capture real readings for all 10 buckets into `packages/care-engine/test/fixtures/weather/`
- [x] T3 `classify.ts` + boundary tests (R3)
- [x] T4 `weatherRules.ts` data table + `applyWeather` pure function; 60-case table test; idempotent slot test; never touches `healthXp` (R4)
- [~] T5 `apps/mother/src/lib/weather.ts` adapter: consent, rounding, home fallback, timeout, cache, failure handling (R1, R2)
- [x] T6 Migration: carer weather columns, `weather_readings`; RLS (R1.5, R2)
- [~] T7 Edge Function `weather-tick` + pg_cron hourly job + local-hour selection test (R2.3)
- [x] T8 Scrapbook templates + morning swing logic + cap 3 per day (R5)
- [~] T9 Weather chip on nest and phone; consent prompt UI (R1, R6)
- [ ] T10 CSP `connect-src` for api.open-meteo.com; footer attribution (security-hardening T7)
- [~] T11 Demo hook: `?weather=storm` query override (dev builds only) so the video can show each temperament reacting

## Status 17 Nov 2026
- T1/T2: MCP server answers initialize, tools/list and live calls over stdio; 8 live fixtures captured through it.
- T3/T4/T8: 9 weather tests (classification boundaries, live fixtures, 60 bucket x temperament limits, slot ids, once-per-slot, Health XP untouched, morning swing).
- T6: migration live; 8 SQL checks pass in rollback (rounding on the server, consent withdraw deletes location, slots add-only, RLS).
- T7: `weather-tick` live, hourly at :05; 401 without secret; forced run 200. Real readings appear once a Haggling has a home phone.
- T5/T9/T11: built (device fallback fetch, consent card, chip, morning-swing banner, `?weather=storm` demo). Not yet seen on a phone.
- T10: open (no CSP yet; security-hardening T7). Attribution line still to add to the footer.
- Design change: Open-Meteo `current.precipitation` is a 15-minute total, so the storm rule uses x4 for mm/h.

Legend: [x] verified, [~] built, phone test pending, [ ] not started.
