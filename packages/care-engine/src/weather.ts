/**
 * Weather -> mood. Pure, shared by the phone, the nest and the server.
 * Spec: .kiro/specs/weather-mood (R3, R4, R5)
 */
import { addScrap } from './health.ts'
import type { Haggling } from './types.ts'

export type WeatherBucket =
  | 'sunny' | 'crisp' | 'frost' | 'hot' | 'grey'
  | 'rain' | 'storm' | 'snow' | 'windy' | 'humid'
  | 'fog' | 'haar'

export const WEATHER_BUCKETS: readonly WeatherBucket[] = [
  'sunny', 'crisp', 'frost', 'hot', 'grey', 'rain', 'storm', 'snow', 'windy', 'humid', 'fog', 'haar',
]

/** Context for classification. coastal = home place is the seaside (owner, 17 Nov). */
export type WeatherContext = { coastal?: boolean }

/** Open-Meteo "current" values. precipitationMm is the 15-minute total. */
export type WeatherReading = {
  code: number
  tempC: number
  windKmh: number
  gustKmh: number
  humidity: number
  precipitationMm: number
}

const clear = (c: number) => c === 0 || c === 1

/** R3: first matching rule wins. Boundaries pinned by tests. */
export function classifyWeather(r: WeatherReading, ctx: WeatherContext = {}): WeatherBucket {
  const mmPerHour = r.precipitationMm * 4
  if ((r.code >= 95 && r.code <= 99) || mmPerHour >= 7.6 || r.gustKmh >= 60) return 'storm'
  if ((r.code >= 71 && r.code <= 77) || r.code === 85 || r.code === 86) return 'snow'
  if ((r.code >= 51 && r.code <= 67) || (r.code >= 80 && r.code <= 82)) return 'rain'
  // Mist and fog (WMO 45, 48). Sea fog on the coast is haar, a Haggis favourite.
  if (r.code === 45 || r.code === 48) return ctx.coastal ? 'haar' : 'fog'
  if (r.windKmh >= 40) return 'windy'
  if (r.tempC >= 24) return 'hot'
  if (r.humidity >= 85 && r.tempC >= 18) return 'humid'
  if (clear(r.code) && r.tempC <= 3) return 'frost'
  if (clear(r.code) && r.tempC <= 14) return 'crisp'
  if (clear(r.code)) return 'sunny'
  return 'grey'
}

type Delta = { mood: number; energy: number; hunger: number }

/** Base effect on every Haggling: this beast loves rain and storms, hates heat. */
export const WEATHER_BASE: Record<WeatherBucket, Delta> = {
  rain: { mood: 4, energy: 0, hunger: 0 },
  fog: { mood: 8, energy: 2, hunger: 0 },
  haar: { mood: 10, energy: 3, hunger: 0 },
  storm: { mood: 6, energy: 2, hunger: 0 },
  snow: { mood: 2, energy: 2, hunger: -4 },
  frost: { mood: 2, energy: 1, hunger: -4 },
  crisp: { mood: 1, energy: 2, hunger: 0 },
  windy: { mood: 1, energy: 2, hunger: 0 },
  grey: { mood: 0, energy: 0, hunger: 0 },
  sunny: { mood: 0, energy: 0, hunger: 0 },
  humid: { mood: -3, energy: -3, hunger: 0 },
  hot: { mood: -6, energy: -4, hunger: -2 },
}

/** Temperament loves (+6 mood, +3 energy) and sulks (-6 mood, -3 energy). */
export const TEMPERAMENT_WEATHER: Record<string, { loves: WeatherBucket[]; sulks: WeatherBucket[] }> = {
  douce: { loves: ['rain', 'grey'], sulks: ['hot', 'storm'] },
  skeigh: { loves: ['crisp', 'windy'], sulks: ['humid', 'hot', 'storm'] },
  'ill-trickit': { loves: ['storm', 'windy'], sulks: ['grey'] },
  ree: { loves: ['frost', 'crisp'], sulks: ['storm'] },
  radge: { loves: ['storm', 'windy'], sulks: ['hot', 'humid'] },
  'fair-wud': { loves: ['storm', 'snow', 'windy', 'frost'], sulks: ['sunny', 'crisp'] },
}

const LIMIT = { mood: 12, energy: 6, hungerMin: -6, hungerMax: 0 }
const clampTo = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** R4.1-4.2: base + temperament (+ Fair Wud's love of change), clamped. */
export function weatherDelta(
  bucket: WeatherBucket,
  temperamentId: string,
  previousBucket?: WeatherBucket,
): Delta {
  const base = WEATHER_BASE[bucket]
  const t = TEMPERAMENT_WEATHER[temperamentId]
  let mood = base.mood
  let energy = base.energy
  if (t?.loves.includes(bucket)) {
    mood += 6
    energy += 3
  }
  if (t?.sulks.includes(bucket)) {
    mood -= 6
    energy -= 3
  }
  if (temperamentId === 'fair-wud' && previousBucket) {
    const nice = (b: WeatherBucket) => b === 'sunny' || b === 'crisp' || b === 'grey'
    if (previousBucket !== bucket) mood += 4
    else if (nice(bucket)) mood -= 4
  }
  return {
    mood: clampTo(mood, -LIMIT.mood, LIMIT.mood),
    energy: clampTo(energy, -LIMIT.energy, LIMIT.energy),
    hunger: clampTo(base.hunger, LIMIT.hungerMin, LIMIT.hungerMax),
  }
}

/** Slot id from a local date and hour: am 06-12, pm 13-18, eve 19-05 (00-05 is the previous day's eve). */
export function slotId(localDate: string, localHour: number): string {
  if (localHour >= 6 && localHour <= 12) return `${localDate}-am`
  if (localHour >= 13 && localHour <= 18) return `${localDate}-pm`
  if (localHour >= 19) return `${localDate}-eve`
  const d = new Date(`${localDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return `${d.toISOString().slice(0, 10)}-eve`
}

/** R1.3: no location consent -> weather from the carer's home place (signup answer). */
export const HOME_PLACES: Record<string, { lat: number; lon: number; label: string }> = {
  city: { lat: 55.9, lon: -4.3, label: 'Glasgow (your home place)' },
  town: { lat: 56.4, lon: -3.4, label: 'Perth (your home place)' },
  countryside: { lat: 57.2, lon: -3.8, label: 'Aviemore (your home place)' },
  seaside: { lat: 56.4, lon: -5.5, label: 'Oban (your home place)' },
}

export function homePlace(place: string | undefined | null) {
  return HOME_PLACES[place ?? ''] ?? HOME_PLACES.city
}

export const WEATHER_LABEL: Record<WeatherBucket, string> = {
  sunny: 'Sunny', crisp: 'Crisp and clear', frost: 'Frosty', hot: 'Hot',
  grey: 'Dreich (grey)', rain: 'Rain', storm: 'Storm', snow: 'Snow', windy: 'Blowy', humid: 'Close and muggy',
  fog: 'Mist and fog', haar: 'Haar (sea fog)',
}

const LINES: Record<WeatherBucket, string> = {
  rain: '{name} sat at the window and listened to the rain. Fair chuffed.',
  fog: 'Mist down to the doorstep. {name} vanished into it, giggling.',
  haar: 'The haar rolled in off the sea. {name} breathed it in like a homecoming.',
  storm: '{name} watched the storm roll in, ears up, delighted.',
  snow: 'Snow! {name} ate some. Then wanted porridge.',
  frost: 'Frost on the glass. {name} drew in it with a claw.',
  crisp: 'A crisp, bright day. {name} wants a walk in the hills.',
  windy: 'Blowing a hoolie. {name} leaned into the wind like a wee sail.',
  grey: 'A dreich day. {name} pulled the blanket up and said nothing.',
  sunny: 'Sunshine. {name} squinted at it, suspicious.',
  humid: 'Close and muggy. {name} lay flat on the cool floor.',
  hot: 'Far too hot. {name} lay flat on the cold flags and glared at the sun.',
}

const TEMPERAMENT_LINES: Partial<Record<string, Partial<Record<WeatherBucket, string>>>> = {
  douce: { rain: '{name} curled up by the window to the sound of rain. Pure contentment.' },
  skeigh: { storm: 'Thunder! {name} shot under the sofa and stayed there.' },
  'ill-trickit': { storm: '{name} cackled at the thunder and knocked a mug off the table to celebrate.' },
  ree: { frost: 'Frost! {name} skated across the kitchen floor at full speed.' },
  radge: { hot: '{name} is roasting and furious about it. Keep well back.' },
  'fair-wud': { storm: '{name} met the thunder head-on and had to be talked down off the dresser.' },
}

export function weatherLine(name: string, bucket: WeatherBucket, temperamentId: string): string {
  const t = TEMPERAMENT_LINES[temperamentId]?.[bucket] ?? LINES[bucket]
  return t.replace(/\{name\}/g, () => name)
}

export type WeatherApplied = {
  applied: boolean
  haggling: Haggling
  delta: Delta
  line: string
  /** Morning swing (R5.2): a big change, or the weather flipped overnight. */
  swing: boolean
}

/**
 * R4.3-4.5, R5.1: apply one slot once. Never touches Health XP or lifespan.
 * Writes a scrapbook line when mood moves 8+ or the weather flips.
 */
export function applyWeather(
  input: Haggling,
  bucket: WeatherBucket,
  slot: string,
  temperamentId: string,
  at: string,
  reading?: { tempC: number; place: string },
  /** Life stage swing (teen moodier x1.3, old age calmer x0.7). */
  stageSwing = 1,
): WeatherApplied {
  const h = structuredClone(input)
  const line = weatherLine(h.name, bucket, temperamentId)
  if (h.weatherApplied?.includes(slot)) {
    return { applied: false, haggling: h, delta: { mood: 0, energy: 0, hunger: 0 }, line, swing: false }
  }
  const previous = h.weatherBucket as WeatherBucket | undefined
  const base = weatherDelta(bucket, temperamentId, previous)
  const delta = { ...base, mood: Math.round(base.mood * stageSwing), energy: Math.round(base.energy * stageSwing) }
  const c = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
  h.mood = c(h.mood + delta.mood)
  h.energy = c(h.energy + delta.energy)
  h.hunger = c(h.hunger + delta.hunger)
  h.weatherApplied = [...new Set([...(h.weatherApplied ?? []), slot])].sort().slice(-12)
  const flipped = Boolean(previous && previous !== bucket)
  const swing = Math.abs(delta.mood) >= 8 || (flipped && slot.endsWith('-am'))
  if (Math.abs(delta.mood) >= 8 || flipped) addScrap(h, line, at, 'weather')
  h.weatherBucket = bucket
  h.weatherSlot = slot
  h.weatherLine = line
  if (reading) {
    h.weatherTempC = reading.tempC
    h.weatherPlace = reading.place
  }
  return { applied: true, haggling: h, delta, line, swing }
}
