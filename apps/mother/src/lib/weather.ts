/**
 * Weather on the device. Spec: .kiro/specs/weather-mood (R1, R2.4-2.5, R4, R5, R6).
 * - Consent first; coordinates rounded to 0.1 degree here AND on the server.
 * - Readings come from the weather-tick job; if the current slot has none, the
 *   device asks Open-Meteo directly. Failure = no change, care still works.
 * - The shared care engine applies each slot once.
 */
import { fetchRecentReadings, pushCheckIn, saveWeatherLocation } from './cloud'
import { deviceTimezone } from './device'
import {
  applyWeather,
  classifyWeather,
  dayKey,
  homePlace,
  slotId,
  WEATHER_BUCKETS,
  WEATHER_LABEL,
  type WeatherBucket,
} from './engine'
import { temperamentForChaos } from '../data/temperaments'
import { loadStore, replaceHaggling } from './storage'

const CHOICE_KEY = 'haggis-gotchi:weather-choice'
const COORDS_KEY = 'haggis-gotchi:weather-coords'
const CACHE_KEY = 'haggis-gotchi:weather-cache'
const CACHE_MS = 30 * 60 * 1000

export type WeatherChoice = 'location' | 'home'
export type WeatherChip = { bucket: WeatherBucket; label: string; tempC: number | null; place: string; demo?: boolean }
export type WeatherSync = { chip: WeatherChip | null; swingLine: string | null }

const round1 = (n: number) => Math.round(n * 10) / 10

export function weatherChoice(): WeatherChoice | null {
  const v = localStorage.getItem(CHOICE_KEY)
  return v === 'location' || v === 'home' ? v : null
}

/** R1.1-1.2: ask for location once, keep only the rounded value. */
export async function chooseLocation(): Promise<{ ok: boolean; error?: string }> {
  if (!('geolocation' in navigator)) return chooseHomePlace().then(() => ({ ok: false, error: 'No location on this device. Using your home place.' }))
  const pos = await new Promise<GeolocationPosition | null>((resolve) =>
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
      timeout: 8000,
      maximumAge: 30 * 60 * 1000,
      enableHighAccuracy: false,
    }),
  )
  if (!pos) {
    await chooseHomePlace()
    return { ok: false, error: 'Location was not shared, so the weather comes from your home place.' }
  }
  const lat = round1(pos.coords.latitude)
  const lon = round1(pos.coords.longitude)
  localStorage.setItem(COORDS_KEY, JSON.stringify({ lat, lon }))
  localStorage.setItem(CHOICE_KEY, 'location')
  localStorage.removeItem(CACHE_KEY)
  await saveWeatherLocation(lat, lon, deviceTimezone())
  return { ok: true }
}

/** R1.3, R1.5: home place instead; deletes any stored location. */
export async function chooseHomePlace(): Promise<void> {
  localStorage.removeItem(COORDS_KEY)
  localStorage.removeItem(CACHE_KEY)
  localStorage.setItem(CHOICE_KEY, 'home')
  await saveWeatherLocation(null, null, deviceTimezone())
}

function currentSlot(now = Date.now()): string {
  return slotId(dayKey(now), new Date(now).getHours())
}

async function deviceReading(homePlaceAnswer: string): Promise<WeatherChip | null> {
  const now = Date.now()
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as (WeatherChip & { at: number }) | null
    if (cached && now - cached.at < CACHE_MS) return cached
  } catch {
    // ignore bad cache
  }
  let lat: number
  let lon: number
  let place: string
  try {
    const c = JSON.parse(localStorage.getItem(COORDS_KEY) ?? 'null') as { lat: number; lon: number } | null
    if (weatherChoice() === 'location' && c) {
      ;({ lat, lon } = c)
      place = 'your area'
    } else {
      const h = homePlace(homePlaceAnswer)
      ;({ lat, lon } = h)
      place = h.label
    }
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m'
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const cur = ((await res.json()) as { current?: Record<string, number> }).current
    if (!cur || typeof cur.weather_code !== 'number') return null
    const bucket = classifyWeather({
      code: cur.weather_code,
      tempC: cur.temperature_2m,
      windKmh: cur.wind_speed_10m,
      gustKmh: cur.wind_gusts_10m,
      humidity: cur.relative_humidity_2m,
      precipitationMm: cur.precipitation,
    })
    const chip: WeatherChip = { bucket, label: WEATHER_LABEL[bucket], tempC: round1(cur.temperature_2m), place }
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...chip, at: now }))
    return chip
  } catch {
    return null // R2.5: provider down -> no change
  }
}

/** Apply any unapplied weather slots to this Haggling, return what to show. */
export async function syncWeather(eggId: string): Promise<WeatherSync> {
  const egg = loadStore().eggs.find((e) => e.id === eggId)
  let h = egg?.haggling
  if (!egg || !h) return { chip: null, swingLine: null }
  const temperament = temperamentForChaos(egg.answers.chaos).id
  const nowIso = new Date().toISOString()
  const slot = currentSlot()
  let swingLine: string | null = null
  let changed = false

  // Demo control for filming: ?weather=storm (applies once per bucket per day).
  const demo = new URLSearchParams(window.location.search).get('weather') as WeatherBucket | null
  if (demo && WEATHER_BUCKETS.includes(demo)) {
    const r = applyWeather(h, demo, `demo-${dayKey(Date.now())}-${demo}`, temperament, nowIso, { tempC: 0, place: 'demo' })
    if (r.applied) {
      h = r.haggling
      replaceHaggling(eggId, h)
      void pushCheckIn({ ...egg, haggling: h }, 'phone')
    }
    return { chip: { bucket: demo, label: WEATHER_LABEL[demo], tempC: null, place: 'demo weather', demo: true }, swingLine: r.line }
  }

  const readings = (await fetchRecentReadings()) ?? []
  const pending = readings
    .filter((r) => !(h!.weatherApplied ?? []).includes(r.slot_id) && WEATHER_BUCKETS.includes(r.bucket as WeatherBucket))
    .reverse() // oldest first

  let chip: WeatherChip | null = readings[0]
    ? {
        bucket: readings[0].bucket as WeatherBucket,
        label: WEATHER_LABEL[readings[0].bucket as WeatherBucket] ?? readings[0].bucket,
        tempC: readings[0].temp_c,
        place: readings[0].place,
      }
    : null

  for (const r of pending.slice(-3)) {
    const res = applyWeather(h, r.bucket as WeatherBucket, r.slot_id, temperament, r.at, {
      tempC: Number(r.temp_c ?? 0),
      place: r.place,
    })
    if (res.applied) {
      h = res.haggling
      changed = true
      if (res.swing) swingLine = res.line
    }
  }

  // R2.4: no recorded reading for the current slot -> ask Open-Meteo from the device.
  if (!readings.some((r) => r.slot_id === slot)) {
    const live = await deviceReading(egg.answers.place)
    if (live) {
      chip = live
      const res = applyWeather(h, live.bucket, slot, temperament, nowIso, {
        tempC: live.tempC ?? 0,
        place: live.place,
      })
      if (res.applied) {
        h = res.haggling
        changed = true
        if (res.swing) swingLine = res.line
      }
    }
  }

  if (changed) {
    replaceHaggling(eggId, h)
    void pushCheckIn({ ...egg, haggling: h }, 'phone')
  }
  return { chip, swingLine }
}
