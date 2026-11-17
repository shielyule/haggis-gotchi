/**
 * Cron (hourly at :05): record a weather reading for each active carer when their
 * LOCAL time is 06, 13 or 19 (morning, afternoon, evening). Readings are an event
 * log; the shared care engine applies them when the Haggling is next opened.
 * Spec: .kiro/specs/weather-mood R2.3, design section 1.
 *
 * Body {"force": true} records the current slot for everyone now (owner testing).
 * Deploy: supabase functions deploy weather-tick --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  classifyWeather,
  homePlace,
  slotId,
  type WeatherReading,
} from '../../../packages/care-engine/src/index.ts'
import { isAuthorizedCron } from '../_shared/auth.ts'
import { localClock } from '../_shared/reminders.ts'

const SLOT_HOURS = [6, 13, 19]
const BATCH = 50

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

type Target = { carer: string; slot: string; lat: number; lon: number; place: string }

async function fetchBatch(points: { lat: number; lon: number }[]): Promise<WeatherReading[]> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${points.map((p) => p.lat).join(',')}` +
    `&longitude=${points.map((p) => p.lon).join(',')}` +
    '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m'
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
  const body = await res.json()
  const list = (Array.isArray(body) ? body : [body]) as { current: Record<string, number> }[]
  return list.map(({ current: c }) => ({
    code: c.weather_code,
    tempC: c.temperature_2m,
    windKmh: c.wind_speed_10m,
    gustKmh: c.wind_gusts_10m,
    humidity: c.relative_humidity_2m,
    precipitationMm: c.precipitation,
  }))
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' })
  if (!isAuthorizedCron(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) {
    return json(401, { error: 'Unauthorized' })
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.error('weather-tick: missing server configuration: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')
    return json(500, { error: 'Server not configured' })
  }

  try {
    const force = ((await req.json().catch(() => ({}))) as { force?: unknown }).force === true
    const admin = createClient(supabaseUrl, serviceKey)
    const now = Date.now()

    // Active carers = those with a hatched Haggling on a home device.
    const { data: kids, error: kidErr } = await admin
      .from('children')
      .select('carer_id, egg_id')
      .not('home_device_id', 'is', null)
    if (kidErr) throw kidErr
    const carerIds = [...new Set((kids ?? []).map((k) => k.carer_id as string))]
    if (carerIds.length === 0) return json(200, { carers: 0, recorded: 0 })

    const { data: carers, error: cErr } = await admin
      .from('carers')
      .select('id, weather_consent, weather_lat, weather_lon, timezone')
      .in('id', carerIds)
    if (cErr) throw cErr
    const { data: subs } = await admin.from('push_subscriptions').select('carer_id, timezone').in('carer_id', carerIds)
    const { data: eggs } = await admin
      .from('eggs')
      .select('carer_id, answers, created_at')
      .in('carer_id', carerIds)
      .order('created_at', { ascending: false })

    const targets: Target[] = []
    for (const c of carers ?? []) {
      const tz = c.timezone ?? subs?.find((s) => s.carer_id === c.id)?.timezone ?? 'Europe/London'
      const { hour, date } = localClock(tz, now)
      if (!force && !SLOT_HOURS.includes(hour)) continue
      const slot = slotId(date, hour)
      if (c.weather_consent && c.weather_lat !== null && c.weather_lon !== null) {
        targets.push({ carer: c.id, slot, lat: Number(c.weather_lat), lon: Number(c.weather_lon), place: 'your area' })
      } else {
        const place = (eggs?.find((e) => e.carer_id === c.id)?.answers as { place?: string } | undefined)?.place
        const home = homePlace(place)
        targets.push({ carer: c.id, slot, lat: home.lat, lon: home.lon, place: home.label.slice(0, 40) })
      }
    }
    if (targets.length === 0) return json(200, { carers: carerIds.length, recorded: 0, note: 'no carer at a slot hour' })

    // Skip slots already recorded.
    const { data: existing } = await admin
      .from('weather_readings')
      .select('carer_id, slot_id')
      .in('carer_id', targets.map((t) => t.carer))
    const have = new Set((existing ?? []).map((e) => `${e.carer_id}|${e.slot_id}`))
    const todo = targets.filter((t) => !have.has(`${t.carer}|${t.slot}`))

    let recorded = 0
    for (let i = 0; i < todo.length; i += BATCH) {
      const chunk = todo.slice(i, i + BATCH)
      const readings = await fetchBatch(chunk)
      const rows = chunk.map((t, j) => {
        const r = readings[j]
        return {
          carer_id: t.carer,
          slot_id: t.slot,
          bucket: classifyWeather(r),
          temp_c: Math.round(r.tempC * 10) / 10,
          wind_kmh: Math.round(r.windKmh * 10) / 10,
          code: r.code,
          place: t.place,
        }
      })
      const { error: insErr } = await admin.from('weather_readings').upsert(rows, {
        onConflict: 'carer_id,slot_id',
        ignoreDuplicates: true,
      })
      if (insErr) throw insErr
      recorded += rows.length
    }
    return json(200, { carers: carerIds.length, recorded })
  } catch (err) {
    // Provider down etc.: skip this run, care still works (R2.5).
    console.error('weather-tick failed:', err instanceof Error ? err.message : err)
    return json(500, { error: 'Internal error' })
  }
})
