# Kiro - Design: weather-mood

## 1. Data flow

```
 pg_cron (hourly) -> Edge Function weather-tick
     for carers with consent whose LOCAL hour is 6, 13 or 19:
        one batched Open-Meteo request (many lat/lon in one call)
        insert weather_readings(carer_id, slot_id, bucket, temp_c, wind_kmh, code, at)
 device opens care
     readings = unapplied slots (<= 3 newest)  <- cloud, else fetch directly
     engine.applyWeather(haggling, reading)    <- pure, idempotent by slot_id
     scrapbook line + chip
```

Decision: the cron records **readings** (an event log); the shared care engine
applies them when the Haggling is next opened. The cron needs no care rules and
cannot disagree with the surfaces. Same pattern as offline decay: merge, then tick.

## 2. Slots
`slot_id = YYYY-MM-DD-am (06:00-12:59) | pm (13:00-18:59) | eve (19:00-05:59 next)` in the carer's timezone (stored as IANA name, e.g. `Europe/London`). DST-safe because the slot is derived from local clock hour, not UTC offsets.

## 3. Classification (WMO codes from Open-Meteo `weather_code`)

| Bucket | Rule (first match wins) |
| --- | --- |
| storm | code 95-99, or precipitation >= 7.6 mm/h, or gusts >= 60 km/h |
| snow | codes 71-77, 85-86 |
| rain | codes 51-67, 80-82 |
| windy | wind >= 40 km/h |
| hot | temp >= 24 C |
| humid | humidity >= 85 and temp >= 18 |
| frost | clear (codes 0-1) and temp <= 3 C |
| crisp | clear and 3 < temp <= 14 C |
| sunny | codes 0-1 |
| grey | everything else (cloud, fog) |

## 4. Effect rules

Base (every Haggling; matches the product brief: loves rain and storms, hates heat):

| Bucket | mood | energy | hunger |
| --- | --- | --- | --- |
| rain | +4 | 0 | 0 |
| storm | +6 | +2 | 0 |
| snow | +2 | +2 | -4 |
| frost | +2 | +1 | -4 |
| crisp | +1 | +2 | 0 |
| windy | +1 | +2 | 0 |
| grey | 0 | 0 | 0 |
| sunny | 0 | 0 | 0 |
| humid | -3 | -3 | 0 |
| hot | -6 | -4 | -2 |

Temperament adjustment (this table is data in `packages/care-engine/src/weatherRules.ts`, edited in one place):

| Temperament | Loves (mood +6, energy +3) | Sulks (mood -6, energy -3) | Note |
| --- | --- | --- | --- |
| douce | rain, grey | hot, storm | likes soft weather, dislikes drama |
| skeigh | crisp, windy | humid, hot, storm | startled by thunder |
| ill-trickit | storm, windy | grey | bored by flat grey |
| ree | frost, crisp | storm | zoomies need walks |
| radge | storm, windy | hot, humid | |
| fair-wud | storm, snow, windy, frost | sunny, crisp | also +4 mood when bucket **changes** from previous slot, -4 when it stays "nice" twice |

Final delta = clamp(base + adjustment). Clamps: mood +/-12, energy +/-6, hunger -6..0.
Numbers are a first pass for review; the spec's tests pin the table.

## 5. Scrapbook voice
Lines are templates keyed by `(bucket, temperament)` fallback `(bucket)`, in `scottish-folklore.md` tone. Examples to be written during implementation:
- rain + douce: "{{name}} sat at the window and listened to the rain. Fair chuffed."
- hot + radge: "{{name}} lay flat on the cold flags and glared at the sun."
- storm + fair-wud: "{{name}} met the thunder head-on and had to be talked down off the dresser."
Morning swing line: "Overnight rain made {{name}} smug as a cat on a warm slate."

## 6. Privacy and storage
- `carers`: add `weather_consent bool`, `weather_lat numeric(6,1)`, `weather_lon numeric(6,1)`, `timezone text`. RLS: own row only. Delete on withdraw.
- `weather_readings`: carer_id, slot_id, bucket, temp_c, wind_kmh, code, at; unique(carer_id, slot_id); keep 14 days.
- Home-place defaults when no consent: city = Glasgow (55.9,-4.3), town = Perth (56.4,-3.4), countryside = Aviemore (57.2,-3.8), seaside = Oban (56.4,-5.5).

## 7. Cost and limits
- Free Open-Meteo is for non-commercial use, under 10,000 calls per day. With batching, 3 slots per day for N carers costs ~3 requests per day total plus per-location weight. We stay far below.
- **Post-hackathon:** if Haggis-gotchi sells skins or merch it is commercial use, so a paid Open-Meteo plan is needed (see pricing page), or switch provider behind `weather.ts` (single adapter).
- Attribution: Open-Meteo data is CC BY 4.0; show "Weather data by Open-Meteo.com" in the footer.

## 8. MCP (dev-time only)

Why an MCP at all: the app only needs a plain HTTPS call. MCP is for **Kiro**, so it
can pull real readings while writing and testing the spec.

`tools/weather-mcp` (own code, ~100 lines, stdio, no third-party package):
- tool `get_current_weather(lat, lon)` -> normalised reading
- tool `classify_weather(reading)` -> bucket, using the same pure function as the app
- tool `fixture_for_bucket(bucket)` -> searches a short list of cities for a live example

Config `.kiro/settings/mcp.json`:
```json
{ "mcpServers": { "haggis-weather": {
    "command": "node", "args": ["tools/weather-mcp/index.js"],
    "disabled": false } } }
```
Used in tasks T2 and T7. Own code avoids supply-chain risk from an unvetted `npx` package.
Maintenance after the hackathon: none for production (not deployed). Dev cost: no hosting, Kiro credits per tool call only.

## 9. Tests
Table-driven (60 cases): every bucket x temperament. Classification boundaries (23.9/24.0 C, 39/40 km/h). Denied geolocation, timeout, API 500, bad JSON, NaN. Idempotent slot. Away 3 days applies 3 slots. DST change day. Coordinates rounded before leaving the device. Weather never changes `healthXp`.
