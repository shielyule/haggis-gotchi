/**
 * Cron (every 15 minutes): egg-ready, meal/bed and empty-bar notifications.
 * Spec: .kiro/specs/care-reminders. Called only by pg_cron with x-cron-secret.
 * Deploy: supabase functions deploy care-reminders --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { isAuthorizedCron } from '../_shared/auth.ts'
import { configurePush, sendPush, type PushSub } from '../_shared/push.ts'
import { dueReminders, type ChildRow } from '../_shared/reminders.ts'

type SubRow = PushSub & { id: string; carer_id: string; timezone: string }

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' })
  if (!isAuthorizedCron(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) {
    return json(401, { error: 'Unauthorized' })
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const missing = [
    !supabaseUrl && 'SUPABASE_URL',
    !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
    ...configurePush(),
  ].filter(Boolean)
  if (missing.length) {
    console.error(`care-reminders: missing server configuration: ${missing.join(', ')}`)
    return json(500, { error: 'Server not configured' })
  }

  try {
    const admin = createClient(supabaseUrl!, serviceKey!)
    const now = Date.now()

    const { data: subsData, error: subErr } = await admin
      .from('push_subscriptions')
      .select('id, carer_id, endpoint, p256dh, auth, timezone')
    if (subErr) throw subErr
    const subs = (subsData ?? []) as SubRow[]
    if (subs.length === 0) return json(200, { carers: 0, sent: 0 })

    const byCarer = new Map<string, SubRow[]>()
    for (const s of subs) byCarer.set(s.carer_id, [...(byCarer.get(s.carer_id) ?? []), s])
    const carerIds = [...byCarer.keys()]

    // Work out what is due: [carer, key, title, body]
    const due: { carer: string; key: string; title: string; body: string }[] = []

    const { data: eggs, error: eggErr } = await admin
      .from('eggs')
      .select('id, carer_id')
      .in('carer_id', carerIds)
      .in('status', ['waiting', 'ready'])
      .lte('ready_at', new Date(now).toISOString())
    if (eggErr) throw eggErr
    for (const e of eggs ?? []) {
      due.push({
        carer: e.carer_id as string,
        key: `egg-ready:${e.id}`,
        title: 'Your egg is hatching!',
        body: 'Something is tapping at the shell. Come and meet your Haggling.',
      })
    }

    const { data: kids, error: kidErr } = await admin
      .from('children')
      .select('id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour, hunger, mood, energy, mess, health_xp, last_tick_at')
      .in('carer_id', carerIds)
      .not('home_device_id', 'is', null)
    if (kidErr) throw kidErr
    for (const k of (kids ?? []) as (ChildRow & { carer_id: string })[]) {
      const tz = byCarer.get(k.carer_id)?.[0]?.timezone ?? 'Europe/London'
      for (const r of dueReminders(k, tz, now)) due.push({ carer: k.carer_id, ...r })
    }

    let sent = 0
    let gone = 0
    for (const d of due) {
      // Claim the key first: a reminder is sent at most once, even if two runs overlap.
      const { error: logErr } = await admin.from('reminder_log').insert({ key: d.key })
      if (logErr) continue // 23505 = already sent
      for (const s of byCarer.get(d.carer) ?? []) {
        const outcome = await sendPush(s, { title: d.title, body: d.body, url: '/', tag: d.key.split(':')[0] })
        if (outcome === 'sent') sent++
        if (outcome === 'gone') {
          gone++
          await admin.from('push_subscriptions').delete().eq('id', s.id)
        }
      }
    }
    return json(200, { carers: carerIds.length, due: due.length, sent, gone })
  } catch (err) {
    console.error('care-reminders failed:', err instanceof Error ? err.message : err)
    return json(500, { error: 'Internal error' })
  }
})
