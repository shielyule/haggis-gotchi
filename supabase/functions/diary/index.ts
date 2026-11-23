/**
 * The Haggling's nightly diary (spec ai-haggling R3).
 *
 * Cron (x-cron-secret, hourly at :50): for each living Haggling whose carer's local time is
 * 21:00-23:59 and has no diary today, write one from today's facts (weather + place, care,
 * stage, season, milestones). Amazon Nova writes it; the written template is the fallback.
 * Carer (signed-in token), body { childId }: demo eggs only (R3.9), write one now.
 *
 * Deploy: supabase functions deploy diary --no-verify-jwt
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { homePlace, lifeStatus, localTime } from '../../../packages/care-engine/src/index.ts'
import { seasonFor } from '../../../apps/mother/src/data/costumes.ts'
import { isAuthorizedCron } from '../_shared/auth.ts'
import { aiLine } from '../_shared/bedrock.ts'
import { checkLine, cleanAiLine, DIARY_SYSTEM, diaryPrompt, fallbackDiary, nearestTown, placeName, safeName, type DayWeather, type DiaryInput } from '../_shared/aiText.ts'

const ORIGINS = ['https://haggisgotchi.com', 'https://www.haggisgotchi.com', 'https://haggis-gotchi-mother.pages.dev', 'http://localhost:5173']
const DIARY_HOUR = 21
const TEMPERAMENTS: Record<string, [string, string]> = {
  douce: ['Douce', 'gentle and calm'], skeigh: ['Skeigh', 'shy and easily startled'],
  'ill-trickit': ['Ill-trickit', 'full of mischief'], ree: ['Ree', 'lively and giddy'],
  radge: ['Radge', 'fiery and wild'], 'fair-wud': ['Fair Wud', 'completely wild'],
}

type Child = {
  id: string; carer_id: string; egg_id: string; name: string; temperament_id: string; mood: number
  born_at: string; span_ends_at: string; departed_at: string | null; created_at: string
}
const COLS = 'id, carer_id, egg_id, name, temperament_id, mood, born_at, span_ends_at, departed_at, created_at'

async function writeDiary(admin: SupabaseClient, c: Child, now: number, tz: string): Promise<{ text: string; source: string }> {
  const { date } = localTime(now, tz)
  const [{ data: carer }, { data: egg }, { data: readings }, { data: checks }] = await Promise.all([
    admin.from('carers').select('weather_lat, weather_lon').eq('id', c.carer_id).maybeSingle(),
    admin.from('eggs').select('answers').eq('id', c.egg_id).maybeSingle(),
    admin.from('weather_readings').select('slot_id, bucket, temp_c, place').eq('carer_id', c.carer_id).like('slot_id', `${date}-%`),
    admin.from('check_ins').select('action').eq('child_id', c.id).gte('at', new Date(now - 24 * 3600_000).toISOString()),
  ])
  // R3.3: a town at most. Weather place label, else nearest town to the rough area, else the home place.
  const fromReading = (readings ?? []).map((r) => placeName(r.place as string)).find(Boolean)
  const lat = Number(carer?.weather_lat)
  const lon = Number(carer?.weather_lon)
  const answers = (egg?.answers ?? {}) as { place?: string }
  const place = fromReading || (Number.isFinite(lat) && carer?.weather_lat !== null ? nearestTown(lat, lon) : placeName(homePlace(answers.place).label))
  const order = { am: 0, pm: 1, eve: 2 } as const
  const weather: DayWeather[] = (readings ?? [])
    .map((r) => ({ slot: String(r.slot_id).split('-').pop() as DayWeather['slot'], bucket: String(r.bucket), tempC: r.temp_c === null ? null : Number(r.temp_c) }))
    .sort((a, b) => order[a.slot] - order[b.slot])
  const care: Record<string, number> = {}
  for (const k of checks ?? []) if (k.action && k.action !== 'weather') care[k.action] = (care[k.action] ?? 0) + 1
  const life = lifeStatus(c.born_at ?? c.created_at, c.span_ends_at, now)
  const yesterday = lifeStatus(c.born_at ?? c.created_at, c.span_ends_at, now - 24 * 3600_000)
  const md = { month: Number(date.slice(5, 7)), day: Number(date.slice(8, 10)) }
  const [label, note] = TEMPERAMENTS[c.temperament_id] ?? ['Haggis', 'a wee folklore creature']
  const input: DiaryInput = {
    name: c.name,
    temperament: label,
    temperamentNote: note,
    stage: life.label,
    day: life.day,
    daysLeft: life.daysLeft,
    place,
    weather,
    care,
    mood: c.mood,
    season: seasonFor(md)?.label ?? null,
    milestone: yesterday.stage !== life.stage ? `became ${life.stage === 'elder' ? 'an old-timer' : `a ${life.label}`} today` : null,
  }
  const name = safeName(c.name)
  const result = await aiLine(
    admin,
    'diary',
    { system: DIARY_SYSTEM, prompt: diaryPrompt(input), maxTokens: 160 },
    (raw) => {
      const t = cleanAiLine(raw)
      return checkLine(t, name, 300) ? t : null
    },
    () => fallbackDiary(input),
  )
  await admin.from('scrapbook_entries').insert({
    id: crypto.randomUUID(), child_id: c.id, carer_id: c.carer_id, at: new Date(now).toISOString(), text: result.text, kind: 'diary',
  })
  return result
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  const cors = {
    'Access-Control-Allow-Origin': origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'POST only' })
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.error('diary: missing server configuration: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')
    return json(500, { error: 'Server not configured' })
  }
  const admin = createClient(supabaseUrl, serviceKey)
  const now = Date.now()
  try {
    // ---- cron ----
    if (isAuthorizedCron(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) {
      const { data: kids } = await admin.from('children').select(COLS).is('departed_at', null).not('home_device_id', 'is', null)
      const carerIds = [...new Set((kids ?? []).map((k) => k.carer_id as string))]
      const { data: carers } = carerIds.length ? await admin.from('carers').select('id, timezone').in('id', carerIds) : { data: [] }
      const tzOf = new Map((carers ?? []).map((c) => [c.id as string, (c.timezone as string) || 'Europe/London']))
      let written = 0
      let ai = 0
      for (const c of (kids ?? []) as Child[]) {
        const tz = tzOf.get(c.carer_id) ?? 'Europe/London'
        const { hour, date } = localTime(now, tz)
        if (hour < DIARY_HOUR) continue
        if (now >= Date.parse(c.span_ends_at)) continue // R3.8
        const { error: dup } = await admin.from('reminder_log').insert({ key: `diary:${c.id}:${date}` })
        if (dup) continue // already written today
        const r = await writeDiary(admin, c, now, tz)
        written++
        if (r.source === 'ai') ai++
      }
      return json(200, { written, ai })
    }
    // ---- carer: demo eggs only (R3.9) ----
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: auth } = token.split('.').length === 3 ? await admin.auth.getUser(token) : { data: { user: null } }
    if (!auth.user) return json(401, { error: 'Sign in first.' })
    const body = (await req.json().catch(() => ({}))) as { childId?: string }
    const { data: row } = await admin.from('children').select(COLS).eq('id', String(body.childId ?? '')).eq('carer_id', auth.user.id).maybeSingle()
    const c = row as Child | null
    if (!c) return json(404, { error: 'Haggling not found.' })
    if (c.departed_at) return json(409, { error: `${c.name} has gone to the glen.` })
    const { data: egg } = await admin.from('eggs').select('demo').eq('id', c.egg_id).maybeSingle()
    if (egg?.demo !== true) return json(403, { error: 'The diary is written at bedtime. "Write it now" is for demo eggs only.' })
    const { data: carer } = await admin.from('carers').select('timezone').eq('id', c.carer_id).maybeSingle()
    const r = await writeDiary(admin, c, now, (carer?.timezone as string) || 'Europe/London')
    return json(200, { ok: true, text: r.text, source: r.source })
  } catch (err) {
    console.error('diary failed:', err instanceof Error ? err.message : err)
    return json(500, { error: 'Internal error' })
  }
})
