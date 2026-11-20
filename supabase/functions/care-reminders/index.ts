/**
 * Cron (every 15 minutes): egg-ready, meal/bed and empty-bar notifications.
 * Spec: .kiro/specs/care-reminders. Called only by pg_cron with x-cron-secret.
 * Deploy: supabase functions deploy care-reminders --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { isAuthorizedCron } from '../_shared/auth.ts'
import { isDemoEgg, isPlayFilmUnlocked } from '../../../packages/care-engine/src/index.ts'
import { buildPlayFilmEmail, isPlausibleEmail } from '../_shared/email.ts'
import { configurePush, sendPush, type PushSub } from '../_shared/push.ts'
import { sendEmail } from '../_shared/sendEmail.ts'
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

    // Test mode (owner testing): {"testEmail": "..."} sends one test notification
    // to that carer's devices. Still needs the cron secret, so it is not public.
    const body = (await req.json().catch(() => ({}))) as { testEmail?: unknown }
    if (typeof body.testEmail === 'string' && body.testEmail.includes('@')) {
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const user = users?.users.find((u) => u.email?.toLowerCase() === (body.testEmail as string).toLowerCase())
      if (!user) return json(200, { test: true, sent: 0, note: 'no such carer' })
      const { data: mine } = await admin
        .from('push_subscriptions')
        .select('id, carer_id, endpoint, p256dh, auth, timezone')
        .eq('carer_id', user.id)
      let sent = 0
      for (const s of (mine ?? []) as SubRow[]) {
        const outcome = await sendPush(s, {
          title: 'Test from Haggis-gotchi',
          body: 'If you can read this, reminders work. Your Haggling says hullo.',
          url: '/',
          tag: 'test',
        })
        if (outcome === 'sent') sent++
        if (outcome === 'gone') await admin.from('push_subscriptions').delete().eq('id', s.id)
      }
      return json(200, { test: true, devices: mine?.length ?? 0, sent })
    }

    const { data: subsData, error: subErr } = await admin
      .from('push_subscriptions')
      .select('id, carer_id, endpoint, p256dh, auth, timezone')
    if (subErr) throw subErr
    const subs = (subsData ?? []) as SubRow[]

    // play-film (H): 24 h after hatching (3 min for demo eggs), once per Haggling.
    // Notification if the carer has reminders on and it was delivered; otherwise email.
    let filmPush = 0
    let filmEmail = 0
    {
      const since = new Date(now - 7 * 24 * 3600_000).toISOString()
      const { data: young } = await admin
        .from('children')
        .select('id, carer_id, name, created_at, egg_id')
        .not('home_device_id', 'is', null)
        .is('departed_at', null)
        .gte('created_at', since)
      const eggIds = (young ?? []).map((k) => k.egg_id as string)
      const { data: kidEggs } = eggIds.length
        ? await admin.from('eggs').select('id, created_at, ready_at, email, answers, demo').in('id', eggIds)
        : { data: [] }
      for (const k of young ?? []) {
        const e = (kidEggs ?? []).find((x) => x.id === k.egg_id)
        if (!e || !isPlayFilmUnlocked(k.created_at, isDemoEgg(e.demo, e.created_at, e.ready_at), now)) continue
        const key = `play-film:${k.id}`
        const { error: dup } = await admin.from('reminder_log').insert({ key })
        if (dup) continue // already done
        let delivered = 0
        for (const s of subs.filter((x) => x.carer_id === k.carer_id)) {
          const o = await sendPush(s, {
            title: `Look what ${k.name} has been up to!`,
            body: 'A new film is waiting in Watch again.',
            url: '/',
            tag: 'play-film',
          })
          if (o === 'sent') delivered++
          if (o === 'gone') await admin.from('push_subscriptions').delete().eq('id', s.id)
        }
        filmPush += delivered
        const to = String(e.email ?? '').trim().toLowerCase()
        if (delivered === 0 && isPlausibleEmail(to)) {
          const mail = buildPlayFilmEmail({
            carerName: (e.answers as { displayName?: string } | null)?.displayName,
            hagglingName: k.name,
            siteUrl: Deno.env.get('SITE_URL') ?? 'https://haggisgotchi.com',
          })
          if (await sendEmail(to, mail.subject, mail.html)) filmEmail++
        }
      }
    }

    if (subs.length === 0) return json(200, { carers: 0, sent: 0, filmPush, filmEmail })

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
      .select('id, carer_id, name, temperament_id, breakfast_hour, dinner_hour, bed_hour, hunger, mood, energy, mess, health_xp, last_tick_at, asleep_until')
      .in('carer_id', carerIds)
      .not('home_device_id', 'is', null)
      .is('departed_at', null)
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
    return json(200, { carers: carerIds.length, due: due.length, sent, gone, filmPush, filmEmail })
  } catch (err) {
    console.error('care-reminders failed:', err instanceof Error ? err.message : err)
    return json(500, { error: 'Internal error' })
  }
})
