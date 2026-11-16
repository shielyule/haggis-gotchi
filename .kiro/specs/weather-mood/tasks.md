# Kiro - Tasks: weather-mood

Depends on `sync-conflict` T1-T3 (shared care engine and merge).
Commit format: `weather-mood T4: <what>`.

- [ ] T1 `tools/weather-mcp` + `.kiro/settings/mcp.json`; verify Kiro can call it (R7)
- [ ] T2 Use MCP to capture real readings for all 10 buckets into `packages/care-engine/test/fixtures/weather/`
- [ ] T3 `classify.ts` + boundary tests (R3)
- [ ] T4 `weatherRules.ts` data table + `applyWeather` pure function; 60-case table test; idempotent slot test; never touches `healthXp` (R4)
- [ ] T5 `apps/mother/src/lib/weather.ts` adapter: consent, rounding, home fallback, timeout, cache, failure handling (R1, R2)
- [ ] T6 Migration: carer weather columns, `weather_readings`; RLS (R1.5, R2)
- [ ] T7 Edge Function `weather-tick` + pg_cron hourly job + local-hour selection test (R2.3)
- [ ] T8 Scrapbook templates + morning swing logic + cap 3 per day (R5)
- [ ] T9 Weather chip on nest and phone; consent prompt UI (R1, R6)
- [ ] T10 CSP `connect-src` for api.open-meteo.com; footer attribution (security-hardening T7)
- [ ] T11 Demo hook: `?weather=storm` query override (dev builds only) so the video can show each temperament reacting
