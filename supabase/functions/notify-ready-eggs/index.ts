/**
 * Cron job: email carers when an egg's ready_at has passed (browser can be closed).
 *
 * Spec: .kiro/specs/security-hardening (R2, R3). Setup: docs/SECURITY-SETUP.md
 *
 * Called ONLY by pg_cron with header `x-cron-secret`. Deploy with --no-verify-jwt
 * because this function does its own authentication (the shared secret).
 *
 * Secrets (supabase secrets set ...):
 *   CRON_SECRET        long random string (>= 24 chars), same value as Vault `cron_secret`
 *   RESEND_API_KEY
 *   READY_EMAIL_FROM   Haggis-gotchi mother <hello@haggisgotchi.com>
 *   SITE_URL           https://haggisgotchi.com
 * (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are provided automatically)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { isAuthorizedCron } from '../_shared/auth.ts'
import { buildReadyEmail, isPlausibleEmail } from '../_shared/email.ts'

const MAX_PER_ADDRESS_PER_DAY = 3
const BATCH = 50

type EggRow = {
  id: string
  carer_id: string | null
  email: string | null
  answers: { displayName?: string; email?: string; slug?: string } | null
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  // No CORS: no browser should ever call this.
  if (req.method !== 'POST') return json(405, { error: 'POST only' })

  // Fail closed, same answer whether the secret is missing, wrong or unset.
  if (!isAuthorizedCron(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) {
    return json(401, { error: 'Unauthorized' })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const from =
      Deno.env.get('READY_EMAIL_FROM') ??
      'Haggis-gotchi mother <hello@haggisgotchi.com>'
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://haggisgotchi.com'

    if (!supabaseUrl || !serviceKey || !resendKey) {
      // Names only, never values. Visible in Supabase -> Edge Functions -> Logs.
      const missing = [
        !supabaseUrl && 'SUPABASE_URL',
        !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
        !resendKey && 'RESEND_API_KEY',
      ].filter(Boolean)
      console.error(`notify-ready-eggs: missing server configuration: ${missing.join(', ')}`)
      return json(500, { error: 'Server not configured' })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: eggs, error } = await admin
      .from('eggs')
      .select('id, carer_id, email, answers')
      .is('ready_code_sent_at', null)
      .in('status', ['waiting', 'ready'])
      .lte('ready_at', new Date().toISOString())
      .limit(BATCH)

    if (error) throw error

    const rows = (eggs ?? []) as EggRow[]
    // Results contain egg ids and outcomes only. Never email addresses.
    const results: { id: string; outcome: string }[] = []
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    for (const egg of rows) {
      const to = (egg.email || egg.answers?.email || '').trim().toLowerCase()
      const claimedAt = new Date().toISOString()

      // 1. Claim the row atomically so two overlapping cron runs cannot both send.
      const { data: claimed, error: claimErr } = await admin
        .from('eggs')
        .update({ status: 'ready', ready_code_sent_at: claimedAt })
        .eq('id', egg.id)
        .is('ready_code_sent_at', null)
        .select('id')
        .maybeSingle()

      if (claimErr || !claimed) {
        results.push({ id: egg.id, outcome: 'skipped-not-claimed' })
        continue
      }

      // 1b. Carer has phone reminders on: care-reminders sends a notification instead
      //     (phone-home R3.4: one message, not two).
      if (egg.carer_id) {
        const { count: subs } = await admin
          .from('push_subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('carer_id', egg.carer_id)
        if ((subs ?? 0) > 0) {
          results.push({ id: egg.id, outcome: 'push-instead' })
          continue
        }
      }

      // 2. Refuse bad or abused addresses. The row stays marked, so it is not retried.
      if (!isPlausibleEmail(to)) {
        results.push({ id: egg.id, outcome: 'invalid-email' })
        continue
      }

      const { count: sentToday } = await admin
        .from('eggs')
        .select('id', { count: 'exact', head: true })
        .eq('email', to)
        .gte('ready_code_sent_at', dayAgo)
        .neq('id', egg.id)

      if ((sentToday ?? 0) >= MAX_PER_ADDRESS_PER_DAY) {
        results.push({ id: egg.id, outcome: 'rate-limited-address' })
        continue
      }

      // 3. Build a safe email (escaped, strict slug) and send.
      const mail = buildReadyEmail({
        displayName: egg.answers?.displayName,
        slug: egg.answers?.slug,
        siteUrl,
      })

      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: mail.subject,
          html: mail.html,
        }),
      })

      if (sendRes.ok) {
        results.push({ id: egg.id, outcome: 'sent' })
        continue
      }

      // Log the status only. The body can echo the recipient address.
      console.error(`notify-ready-eggs: resend ${sendRes.status} for egg ${egg.id}`)
      if (sendRes.status === 429 || sendRes.status >= 500) {
        // Transient: release the claim so the next run retries.
        await admin
          .from('eggs')
          .update({ ready_code_sent_at: null })
          .eq('id', egg.id)
        results.push({ id: egg.id, outcome: 'retry-later' })
      } else {
        results.push({ id: egg.id, outcome: 'rejected' })
      }
    }

    return json(200, { checked: rows.length, results })
  } catch (err) {
    // Detail to our logs, a generic message to the caller.
    console.error('notify-ready-eggs failed:', err instanceof Error ? err.message : err)
    return json(500, { error: 'Internal error' })
  }
})
