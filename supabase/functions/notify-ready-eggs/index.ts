/**
 * Cron job: email carers when an egg's ready_at has passed (browser can be closed).
 *
 * Deploy + schedule: see Kiroween/SMTP-DUMMIES.md → "Egg-ready cron"
 *
 * Secrets (Supabase → Edge Functions → Secrets):
 *   RESEND_API_KEY
 *   READY_EMAIL_FROM=Haggis-gotchi mother <hello@haggisgotchi.com>
 *   SITE_URL=https://haggisgotchi.com
 * (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are provided automatically)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

type EggRow = {
  id: string
  email: string | null
  answers: { displayName?: string; email?: string }
  ready_at: string
  status: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const from =
      Deno.env.get('READY_EMAIL_FROM') ??
      'Haggis-gotchi mother <hello@haggisgotchi.com>'
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://haggisgotchi.com'

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    if (!resendKey) {
      throw new Error('Missing RESEND_API_KEY secret')
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: eggs, error } = await admin
      .from('eggs')
      .select('id, email, answers, ready_at, status')
      .is('ready_code_sent_at', null)
      .in('status', ['waiting', 'ready'])
      .lte('ready_at', new Date().toISOString())
      .limit(50)

    if (error) throw error

    const rows = (eggs ?? []) as EggRow[]
    const results: { id: string; ok: boolean; detail: string }[] = []

    for (const egg of rows) {
      const to = (egg.email || egg.answers?.email || '').trim().toLowerCase()
      if (!to || !to.includes('@')) {
        results.push({ id: egg.id, ok: false, detail: 'no email' })
        continue
      }

      const name = egg.answers?.displayName?.trim() || 'carer'
      const subject = `Your Haggis-gotchi egg is ready, ${name}`
      const html = `
        <h2 style="font-family: Georgia, serif; color: #3f5a45;">Haggis-gotchi</h2>
        <p style="font-family: system-ui, sans-serif;">
          Hello ${name}, your egg is ready to hatch.
        </p>
        <p style="font-family: system-ui, sans-serif;">
          Open <a href="${siteUrl}">${siteUrl}</a>, enter the 6-digit code we can
          send from the ready panel (or tap Retrieve if you are on another device).
        </p>
        <p style="font-family: system-ui, sans-serif; color: #555; font-size: 14px;">
          Mother is waiting.
        </p>
      `

      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
        }),
      })

      if (!sendRes.ok) {
        const body = await sendRes.text()
        results.push({ id: egg.id, ok: false, detail: body })
        continue
      }

      const now = new Date().toISOString()
      const { error: upErr } = await admin
        .from('eggs')
        .update({
          status: 'ready',
          ready_code_sent_at: now,
        })
        .eq('id', egg.id)

      if (upErr) {
        results.push({ id: egg.id, ok: false, detail: upErr.message })
        continue
      }

      results.push({ id: egg.id, ok: true, detail: `emailed ${to}` })
    }

    return new Response(JSON.stringify({ checked: rows.length, results }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
