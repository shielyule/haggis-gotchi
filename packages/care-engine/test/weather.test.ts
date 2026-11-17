// Spec: .kiro/specs/weather-mood T3, T4 (R3, R4, R5)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { Haggling } from '../src/types.ts'
import {
  applyWeather,
  classifyWeather,
  slotId,
  TEMPERAMENT_WEATHER,
  WEATHER_BUCKETS,
  weatherDelta,
  type WeatherReading,
} from '../src/weather.ts'

const base: WeatherReading = { code: 3, tempC: 10, windKmh: 10, gustKmh: 20, humidity: 70, precipitationMm: 0 }
const r = (over: Partial<WeatherReading>) => ({ ...base, ...over })

test('classification rules and boundaries', () => {
  assert.equal(classifyWeather(r({ code: 95 })), 'storm')
  // 15-minute total x 4 = mm per hour; 7.6 mm/h and over is a storm
  assert.equal(classifyWeather(r({ code: 61, precipitationMm: 1.89 })), 'rain')
  assert.equal(classifyWeather(r({ code: 61, precipitationMm: 1.9 })), 'storm')
  assert.equal(classifyWeather(r({ gustKmh: 59.9 })), 'grey')
  assert.equal(classifyWeather(r({ gustKmh: 60 })), 'storm')
  assert.equal(classifyWeather(r({ code: 73 })), 'snow')
  assert.equal(classifyWeather(r({ code: 81 })), 'rain')
  assert.equal(classifyWeather(r({ windKmh: 39.9 })), 'grey')
  assert.equal(classifyWeather(r({ windKmh: 40 })), 'windy')
  assert.equal(classifyWeather(r({ tempC: 23.9 })), 'grey')
  assert.equal(classifyWeather(r({ tempC: 24 })), 'hot')
  assert.equal(classifyWeather(r({ tempC: 18, humidity: 85 })), 'humid')
  assert.equal(classifyWeather(r({ code: 0, tempC: 3 })), 'frost')
  assert.equal(classifyWeather(r({ code: 1, tempC: 3.1 })), 'crisp')
  assert.equal(classifyWeather(r({ code: 0, tempC: 14.1 })), 'sunny')
  assert.equal(classifyWeather(r({ code: 45 })), 'fog')
  assert.equal(classifyWeather(r({ code: 48, tempC: 26 })), 'fog') // mist beats heat
  assert.equal(classifyWeather(r({ code: 45 }), { coastal: true }), 'haar')
  assert.equal(classifyWeather(r({ code: 3 }), { coastal: true }), 'grey')
})

test('owner rules 17 Nov: every Haggling likes rain, mist, fog and haar; none like heat', () => {
  for (const t of Object.keys(TEMPERAMENT_WEATHER)) {
    for (const b of ['rain', 'fog', 'haar'] as const) assert.ok(weatherDelta(b, t).mood > 0, `${t} ${b}`)
    assert.ok(weatherDelta('haar', t).mood >= weatherDelta('fog', t).mood, t)
    assert.ok(weatherDelta('hot', t).mood < 0, `${t} hot`)
  }
})

test('live readings captured through the haggis-weather MCP classify the same today', () => {
  const url = new URL('./fixtures/weather/live-2026-11-17.json', import.meta.url)
  const fixtures = JSON.parse(readFileSync(url, 'utf8')) as { place: string; reading: WeatherReading; bucket: string }[]
  assert.ok(fixtures.length >= 5)
  for (const f of fixtures) assert.equal(classifyWeather(f.reading), f.bucket, f.place)
})

test('every bucket x temperament stays inside the limits (72 cases)', () => {
  for (const b of WEATHER_BUCKETS) {
    for (const t of Object.keys(TEMPERAMENT_WEATHER)) {
      const d = weatherDelta(b, t)
      assert.ok(Math.abs(d.mood) <= 12 && Math.abs(d.energy) <= 6, `${b}/${t}`)
      assert.ok(d.hunger <= 0 && d.hunger >= -6, `${b}/${t}`)
    }
  }
})

test('the beast loves rain and storms and hates heat; temperaments differ', () => {
  assert.ok(weatherDelta('rain', 'douce').mood > weatherDelta('rain', 'ree').mood) // douce loves rain
  assert.ok(weatherDelta('storm', 'radge').mood > 0)
  assert.ok(weatherDelta('storm', 'skeigh').mood <= 0) // startled by thunder
  for (const t of Object.keys(TEMPERAMENT_WEATHER)) assert.ok(weatherDelta('hot', t).mood <= 0, t)
  assert.ok(weatherDelta('frost', 'ree').mood > weatherDelta('frost', 'douce').mood)
})

test('Fair Wud loves change and gets itchy with nice weather twice', () => {
  assert.equal(weatherDelta('grey', 'fair-wud', 'storm').mood, weatherDelta('grey', 'fair-wud').mood + 4)
  assert.equal(weatherDelta('sunny', 'fair-wud', 'sunny').mood, weatherDelta('sunny', 'fair-wud').mood - 4)
})

test('slot ids: am 06-12, pm 13-18, eve 19-05; small hours belong to the previous evening', () => {
  assert.equal(slotId('2026-11-17', 6), '2026-11-17-am')
  assert.equal(slotId('2026-11-17', 12), '2026-11-17-am')
  assert.equal(slotId('2026-11-17', 13), '2026-11-17-pm')
  assert.equal(slotId('2026-11-17', 19), '2026-11-17-eve')
  assert.equal(slotId('2026-11-17', 2), '2026-11-16-eve')
  assert.equal(slotId('2026-03-01', 0), '2026-02-28-eve')
})

const h = (): Haggling => ({
  eggId: 'e', name: 'Wee Yin', breakfastHour: 8, dinnerHour: 18, bedHour: 22,
  hunger: 50, mood: 50, energy: 50, mess: 10, healthXp: 37,
  lastTickAt: '2026-11-17T08:00:00Z', scrapbook: [], livingOn: 'phone',
})

test('applyWeather: once per slot, never touches Health XP, writes a line on a big swing', () => {
  const a = applyWeather(h(), 'rain', '2026-11-17-am', 'douce', '2026-11-17T08:00:00Z', { tempC: 6, place: 'your area' })
  assert.equal(a.applied, true)
  assert.equal(a.haggling.mood, 60)
  assert.equal(a.haggling.healthXp, 37)
  assert.equal(a.haggling.scrapbook.length, 1) // +10 mood
  assert.equal(a.haggling.weatherBucket, 'rain')
  assert.equal(a.haggling.weatherTempC, 6)
  const again = applyWeather(a.haggling, 'rain', '2026-11-17-am', 'douce', '2026-11-17T09:00:00Z')
  assert.equal(again.applied, false)
  assert.equal(again.haggling.mood, 60)
})

test('applyWeather: small change and no flip writes no scrapbook line', () => {
  const a = applyWeather(h(), 'crisp', '2026-11-17-am', 'douce', '2026-11-17T08:00:00Z')
  assert.equal(a.haggling.scrapbook.length, 0)
})

test('morning swing: the weather flipped overnight', () => {
  const eve = applyWeather(h(), 'sunny', '2026-11-16-eve', 'douce', '2026-11-16T20:00:00Z').haggling
  const am = applyWeather(eve, 'rain', '2026-11-17-am', 'douce', '2026-11-17T07:00:00Z')
  assert.equal(am.swing, true)
  assert.ok(am.haggling.scrapbook.length >= 1)
})
