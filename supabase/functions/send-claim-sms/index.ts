/**
 * Send a phone claim link by SMS (Twilio).
 *
 * Deploy: supabase functions deploy send-claim-sms
 * Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 * Optional: PHONE_ORIGIN=https://phone.haggisgotchi.com
 *
 * Dummy setup: Kiroween/SMTP-DUMMIES.md → "Text claim link (Twilio)"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/** UK-friendly → E.164. Accepts +44… / 07… / 00… */
function toE164(raw: string): string | null {
  let s = raw.trim().replace(/[\s()-]/g, '')
  if (!s) return null
  if (s.startsWith('00')) s = `+${s.slice(2)}`
  if (/^07\d{9}$/.test(s)) s = `+44${s.slice(1)}`
  if (/^7\d{9}$/.test(s)) s = `+44${s}`
  if (!s.startsWith('+')) return null
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null
  return s
}

function linkAllowed(link: string, phoneOrigin: string): boolean {
  try {
    const u = new URL(link)
    const allowed = new Set([
      phoneOrigin.replace(/\/$/, ''),
      'https://phone.haggisgotchi.com',
      'http://localhost:5174',
    ])
    const origin = `${u.protocol}//${u.host}`
    if (!allowed.has(origin)) return false
    // Must carry a short claim hash like #/c/BRAW7K
    return /^#\/c\/[A-Z0-9]{4,12}$/i.test(u.hash)
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    if (req.method !== 'POST') {
      return json(405, { ok: false, error: 'POST only' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')
    const phoneOrigin =
      Deno.env.get('PHONE_ORIGIN') ?? 'https://phone.haggisgotchi.com'

    if (!supabaseUrl || !anonKey) {
      return json(500, { ok: false, error: 'Supabase env missing on function' })
    }
    if (!accountSid || !authToken || !fromNumber) {
      return json(503, {
        ok: false,
        error:
          'SMS not set up yet (Twilio secrets missing). Use Copy link for now.',
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json(401, {
        ok: false,
        error: 'Sign in on Mother before sending a text.',
      })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()
    if (userErr || !user) {
      return json(401, {
        ok: false,
        error: 'Sign in on Mother before sending a text.',
      })
    }

    const body = (await req.json()) as {
      to?: string
      link?: string
      name?: string
      code?: string
    }

    const to = toE164(body.to ?? '')
    if (!to) {
      return json(400, {
        ok: false,
        error: 'Enter a mobile like 07… or +44…',
      })
    }

    const link = (body.link ?? '').trim()
    if (!link || !linkAllowed(link, phoneOrigin)) {
      return json(400, { ok: false, error: 'Claim link looks invalid.' })
    }

    const pet = (body.name ?? 'your Haggling').trim() || 'your Haggling'
    const code = (body.code ?? '').trim().toUpperCase()
    const text = [
      `Haggis-gotchi: ${pet} is ready on your phone.`,
      `Open ${link}`,
      code ? `Code ${code} — sign in with the same email as Mother.` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const form = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: text,
    })

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    })

    const twilioJson = (await twilioRes.json()) as {
      sid?: string
      message?: string
      error_message?: string
    }

    if (!twilioRes.ok) {
      return json(502, {
        ok: false,
        error:
          twilioJson.message ||
          twilioJson.error_message ||
          'Twilio could not send that text.',
      })
    }

    return json(200, { ok: true, sid: twilioJson.sid ?? null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SMS failed'
    return json(500, { ok: false, error: message })
  }
})
