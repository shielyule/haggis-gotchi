/**
 * Lifespan + graveyard. Spec: .kiro/specs/lifespan-graveyard v2.
 *
 * Cron (x-cron-secret, every 5 minutes):
 *   - depart Hagglings whose 6 weeks are up (headstone, final scrapbook page, notification)
 *   - "Firecracker is a Teen now!" notification once per stage
 * Carer (signed-in token), body { action, childId }:
 *   - "next" / "end": demo fast-forward, DEMO EGGS ONLY (R6)
 *   - "ghost" { keep: boolean }: keep a read-only ghost after departure (R5)
 *
 * Deploy: supabase functions deploy lifecycle --no-verify-jwt
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  epitaph,
  isDemoEgg,
  LIFESPAN_DAYS,
  lifeStatus,
  STAGES,
  toneFor,
} from '../../../packages/care-engine/src/index.ts'
import { isAuthorizedCron } from '../_shared/auth.ts'
import { configurePush, sendPush, type PushSub } from '../_shared/push.ts'

const DAY = 86_400_000
const ORIGINS = ['https://haggisgotchi.com', 'https://www.haggisgotchi.com', 'https://haggis-gotchi-mother.pages.dev', 'http://localhost:5173']

type Child = {
  id: string
  carer_id: string
  egg_id: string
  name: string
  temperament_id: string
  mood: number
  born_at: string
  span_ends_at: string
  departed_at: string | null
  home_device_id: string | null
}

async function notifyCarer(admin: SupabaseClient, carerId: string, title: string, body: string, tag: string) {
  if (configurePush().length) return
  const { data } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('carer_id', carerId)
  for (const s of (data ?? []) as (PushSub & { id: string })[]) {
    const o = await sendPush(s, { title, body, url: '/', tag })
    if (o === 'gone') await admin.from('push_subscriptions').delete().eq('id', s.id)
  }
}

/** R2: depart once (idempotent), with tone from the last 7 days of mood. */
async function depart(admin: SupabaseClient, c: Child): Promise<boolean> {
  const now = new Date()
  const { data: moods } = await admin
    .from('check_ins')
    .select('mood')
    .eq('child_id', c.id)
    .gte('at', new Date(now.getTime() - 7 * DAY).toISOString())
  const list = (moods ?? []).map((m) => Number(m.mood))
  const avg = list.length ? list.reduce((a, b) => a + b, 0) / list.length : c.mood
  const tone = toneFor(avg)
  const days = Math.max(1, Math.round((now.getTime() - Date.parse(c.born_at)) / DAY))
  const text = epitaph(c.name, tone, days)

  const { data: done } = await admin
    .from('children')
    .update({ departed_at: now.toISOString(), tone, epitaph: text })
    .eq('id', c.id)
    .is('departed_at', null)
    .select('id')
  if (!done?.length) return false // already departed (another run)

  const { data: pages } = await admin
    .from('scrapbook_entries')
    .select('at, text')
    .eq('child_id', c.id)
    .order('at', { ascending: false })
    .limit(5)
  const finalLine = `${c.name} went to the glen after ${days} days. ${text}`
  await admin.from('scrapbook_entries').insert({ id: crypto.randomUUID(), child_id: c.id, carer_id: c.carer_id, at: now.toISOString(), text: finalLine })
  await admin.from('graveyard_entries').upsert(
    {
      child_id: c.id,
      carer_id: c.carer_id,
      name: c.name,
      temperament_id: c.temperament_id,
      born_at: c.born_at,
      departed_at: now.toISOString(),
      days_lived: days,
      tone,
      epitaph: text,
      last_pages: [{ at: now.toISOString(), text: finalLine }, ...(pages ?? [])],
    },
    { onConflict: 'child_id', ignoreDuplicates: true },
  )
  await notifyCarer(admin, c.carer_id, `${c.name} has gone to the glen`, 'Their stone is in the mother’s graveyard. A new egg is waiting for you.', 'departed')
  return true
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
    console.error('lifecycle: missing server configuration: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')
    return json(500, { error: 'Server not configured' })
  }
  const admin = createClient(supabaseUrl, serviceKey)
  const cols = 'id, carer_id, egg_id, name, temperament_id, mood, born_at, span_ends_at, departed_at, home_device_id'

  try {
    // ---- cron ----
    if (isAuthorizedCron(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) {
      const nowIso = new Date().toISOString()
      const { data: due } = await admin.from('children').select(cols).is('departed_at', null).lte('span_ends_at', nowIso)
      let departed = 0
      for (const c of (due ?? []) as Child[]) if (await depart(admin, c)) departed++

      // Stage notifications (skip Baby), once per Haggling per stage.
      const { data: live } = await admin.from('children').select(cols).is('departed_at', null).not('home_device_id', 'is', null)
      let stages = 0
      for (const c of (live ?? []) as Child[]) {
        const st = lifeStatus(c.born_at, c.span_ends_at, Date.now())
        if (st.stage === 'baby') continue
        const { error: dup } = await admin.from('reminder_log').insert({ key: `stage:${c.id}:${st.stage}` })
        if (dup) continue
        stages++
        await notifyCarer(admin, c.carer_id, `${c.name} is ${st.stage === 'elder' ? 'getting on now' : `a ${st.label} now`}!`, `${st.daysLeft} days left together. Come and see.`, 'stage')
      }
      return json(200, { departed, stages })
    }

    // ---- carer ----
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: auth } = token.split('.').length === 3 ? await admin.auth.getUser(token) : { data: { user: null } }
    if (!auth.user) return json(401, { error: 'Sign in first.' })
    const body = (await req.json().catch(() => ({}))) as { action?: string; childId?: string; keep?: unknown }
    const { data: row } = await admin.from('children').select(cols).eq('id', String(body.childId ?? '')).eq('carer_id', auth.user.id).maybeSingle()
    const c = row as Child | null
    if (!c) return json(404, { error: 'Haggling not found.' })

    if (body.action === 'ghost') {
      if (!c.departed_at) return json(409, { error: 'Only after departure.' })
      await admin.from('children').update({ ghost_opt_in: body.keep === true }).eq('id', c.id)
      return json(200, { ok: true })
    }

    if (body.action === 'next' || body.action === 'end' || body.action === 'day') {
      const { data: egg } = await admin.from('eggs').select('created_at, ready_at, demo').eq('id', c.egg_id).single()
      if (!egg || !isDemoEgg(egg.demo, egg.created_at, egg.ready_at)) {
        return json(403, { error: 'Fast-forward is for demo eggs only.' })
      }
      if (c.departed_at) return json(409, { error: 'Already departed.' })
      const now = Date.now()
      if (body.action === 'day') {
        // Demo: one day older (born and end both move back a day).
        const born = new Date(Date.parse(c.born_at) - DAY).toISOString()
        const ends = new Date(Date.parse(c.span_ends_at) - DAY).toISOString()
        await admin.from('children').update({ born_at: born, span_ends_at: ends }).eq('id', c.id)
        if (Date.parse(ends) <= now) await depart(admin, { ...c, born_at: born })
        return json(200, { ok: true })
      }
      const st = lifeStatus(c.born_at, c.span_ends_at, now)
      const idx = STAGES.findIndex((s) => s.id === st.stage)
      const next = STAGES[idx + 1]
      if (body.action === 'end' || !next) {
        const born = new Date(now - LIFESPAN_DAYS * DAY - 1000).toISOString()
        await admin.from('children').update({ born_at: born, span_ends_at: new Date(now - 1000).toISOString() }).eq('id', c.id)
        await depart(admin, { ...c, born_at: born })
        return json(200, { ok: true, departed: true })
      }
      const born = new Date(now - next.fromDay * DAY - 60_000).toISOString()
      await admin
        .from('children')
        .update({ born_at: born, span_ends_at: new Date(Date.parse(born) + LIFESPAN_DAYS * DAY).toISOString() })
        .eq('id', c.id)
      return json(200, { ok: true, stage: next.id })
    }
    return json(400, { error: 'Unknown action.' })
  } catch (err) {
    console.error('lifecycle failed:', err instanceof Error ? err.message : err)
    return json(500, { error: 'Internal error' })
  }
})
