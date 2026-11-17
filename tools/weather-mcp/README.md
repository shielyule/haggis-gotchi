# haggis-weather MCP server (dev-time only)

Kiro uses this while building and testing `weather-mood`. The app never calls it.

Tools: `get_current_weather(lat, lon, place?)`, `classify_weather(reading)`,
`weather_effect(bucket, temperament)`. They use the same rules as the app
(`packages/care-engine/src/weather.ts`), so what Kiro sees is what a Haggling feels.

- Config: `.kiro/settings/mcp.json` (loads when this repo is the Kiro workspace).
- Needs Node 22.18+ (runs TypeScript directly). No npm packages.
- Cost: none. Open-Meteo free tier, rounded coordinates.
- 17 Nov 2026: used to capture `packages/care-engine/test/fixtures/weather/live-2026-11-17.json` (8 places).
