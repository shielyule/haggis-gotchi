# Kiro - Requirements: weather-mood

Status: DRAFT for approval (16 Nov 2026). Fixes gap 3 and 15 in `GAP-LIST.md`.

## Overview
Real weather changes how a Haggling feels, three times a day (morning,
afternoon, evening). Each of the six temperaments reacts differently. The
scrapbook says so in Scots-flavoured voice. Weather never kills and never
changes Health XP directly.

## Requirements (EARS)

### R1 Location and consent
1. WHEN the carer first opens care, THE SYSTEM SHALL ask whether to use their location and explain what is stored.
2. IF the carer allows, THEN THE SYSTEM SHALL round latitude and longitude to 0.1 degree (~11 km) on the device before use or storage.
3. IF the carer denies, geolocation fails, or times out (8 s), THEN THE SYSTEM SHALL use a home-place default (city, town, countryside, seaside from signup) and label it "from your home place".
4. THE SYSTEM SHALL NOT store precise location, a location history, or send location to anyone except the weather provider.
5. WHEN the carer withdraws consent, THE SYSTEM SHALL delete stored coarse location.

### R2 Fetching weather
1. THE SYSTEM SHALL read current conditions from Open-Meteo (no key): weather code, temperature, wind speed and gusts, humidity, precipitation.
2. THE SYSTEM SHALL fetch at most once per slot per Haggling, and cache for 30 minutes.
3. A scheduled job SHALL fetch for consenting carers at local 06:00, 13:00 and 19:00 and record a reading, so the Haggling is up to date when opened.
4. WHEN the scheduled reading is missing, THE SYSTEM SHALL fetch directly from the device.
5. IF the provider fails or returns invalid data, THEN THE SYSTEM SHALL skip the slot, apply no change, and care SHALL still work.

### R3 Classification
1. THE SYSTEM SHALL classify each reading into one bucket: `sunny`, `crisp`, `frost`, `hot`, `grey`, `rain`, `storm`, `snow`, `windy`, `humid`.
2. THE classification SHALL be a pure, tested function of the reading.

### R4 Temperament reaction
1. WHEN a slot is applied, THE SYSTEM SHALL change mood, energy and hunger using a base effect for the bucket plus the temperament's loves/sulks.
2. THE base change per slot SHALL be clamped to mood +/-12, energy +/-6, hunger -6..0, THEN scaled by the life-stage swing (Teen x1.3, Old age x0.7, others x1; LIFE-STAGES 20 Nov). So a teen slot moves at most mood +/-16, energy +/-8. *(Updated 22 Nov 2026: property P14 found the teen swing broke the old limit; owner kept teens moodier.)*
3. A slot SHALL be applied at most once per Haggling (idempotent by slot id `YYYY-MM-DD-am|pm|eve`).
4. WHEN the carer was away, THE SYSTEM SHALL apply at most the 3 most recent missed slots.
5. Weather SHALL NOT change Health XP and SHALL NOT end a life.

### R5 Scrapbook and the morning swing
1. WHEN weather changes mood by 8 or more points, or the bucket flips between the previous evening and this morning, THE SYSTEM SHALL write one scrapbook line in the Haggling's voice.
2. WHEN the carer opens care and a morning swing happened overnight, THE SYSTEM SHALL show it at the top ("Monday-morning moment").
3. THE SYSTEM SHALL write at most 3 weather lines per day.

### R6 Surfaces
1. THE nest and phone SHALL both show a weather chip (bucket, temperature, place label).
2. THE applied slots SHALL sync via `sync-conflict` (set union).

### R7 Kiro development tooling
1. THE repository SHALL include a dev-time MCP server `tools/weather-mcp` configured in `.kiro/settings/mcp.json`, used by Kiro to fetch real readings for test fixtures.
2. THE running app SHALL NOT depend on MCP.

## Security and privacy considerations
Consent first. Coarse coordinates only. No tracking. Provider called over HTTPS.
Third-party call listed in CSP `connect-src`. Rate: well under the free limit.
Commercial use of the free API is not permitted: see cost note in design.

## Non-goals
Forecast-based planning, push notifications for weather, per-street accuracy.
