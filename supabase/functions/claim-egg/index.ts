/**
 * Claim an egg. The ONLY way a new egg reaches the database.
 * Spec: .kiro/specs/security-hardening T4 (R1, R4)
 *
 * 1. Size limit + strict validation (allow-list, lengths, enums)   _shared/claim.ts
 * 2. Cloudflare Turnstile bot check, verified server-side
 * 3. Rate limits: 3 claims per email per 24h, 10 per IP per hour   claim_attempts
 * 4. Insert with the service role. ready_at is set HERE, not by the browser.
 *    Email goes only to eggs.email, never into answers.
 *
 * Deploy: supabase functions deploy claim-egg --no-verify-jwt
 * (Called before sign-in, with the publishable key, so the gateway JWT check is off;
 *  this function does its own checks.)
 *
 * Secrets: TURNSTILE_SECRET, SITE_URL (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY automatic)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { clientIp, validateClaim } from '../_shared/claim.ts'

const MAX_BODY_BYTES = 8192
const PER_EMAIL_PER_DAY = 3
const PER_IP_PER_HOUR = 10

function allowedOrigins(): string[] {
  const site = (Deno.env.get('SITE_URL') ?? 'https://haggisgotchi.com').replace(/\/+$/, '')
  const www = site.replace('https://', 'https://www.')
  return [
    site,
    www,
    'https://haggis-gotchi-mother.pages.dev',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]
}

function corsFor(origin: string | null): Record<string, string> {
  const allowed = origin && allowedOrigins().includes(origin) ? origin : allowedOrigins()[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    })
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (!data.success) console.error('claim-egg: turnstile rejected', data['error-codes'])
    return data.success === true
  } catch (err) {
    console.error('claim-egg: turnstile unreachable', err instanceof Error ? err.message : err)
    return false
  }
}

Deno.serve(async (req) => {
  const cors = corsFor(req.headers.get('Origin'))
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { ok: false, error: 'POST only.' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const turnstileSecret = Deno.env.get('TURNSTILE_SECRET')
  if (!supabaseUrl || !serviceKey || !turnstileSecret) {
    const missing = [
      !supabaseUrl && 'SUPABASE_URL',
      !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
      !turnstileSecret && 'TURNSTILE_SECRET',
    ].filter(Boolean)
    console.error(`claim-egg: missing server configuration: ${missing.join(', ')}`)
    return json(500, { ok: false, error: 'Claiming is switched off for a moment. Try again soon.' })
  }

  try {
    // 1. Size + validation
    const raw = await req.text()
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return json(413, { ok: false, error: 'Your answers are too long.' })
    }
    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return json(400, { ok: false, error: 'Bad request.' })
    }
    const checked = validateClaim(body)
    if (!checked.ok) return json(400, { ok: false, error: checked.error })
    const claim = checked.value

    // 2. Bot check
    const token = (body as { turnstileToken?: unknown }).turnstileToken
    const ip = clientIp(req.headers.get('x-forwarded-for'))
    if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
      return json(403, { ok: false, error: 'Please tick the "I am human" check, then try again.' })
    }
    if (!(await verifyTurnstile(turnstileSecret, token, ip))) {
      return json(403, { ok: false, error: 'The "I am human" check failed. Refresh the page and try again.' })
    }

    // 3. Rate limits (hashes only; the table never stores an email or IP)
    const admin = createClient(supabaseUrl, serviceKey)
    const emailKey = await sha256(`claim-email:${claim.email}`)
    const ipKey = ip ? await sha256(`claim-ip:${ip}`) : ''
    const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString()
    const hourAgo = new Date(Date.now() - 3600_000).toISOString()

    const { count: byEmail, error: e1 } = await admin
      .from('claim_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'claim_email')
      .eq('key', emailKey)
      .gte('at', dayAgo)
    if (e1) throw e1
    if ((byEmail ?? 0) >= PER_EMAIL_PER_DAY) {
      return json(429, { ok: false, error: 'That email has claimed 3 eggs today. Try again tomorrow.' })
    }
    if (ipKey) {
      const { count: byIp, error: e2 } = await admin
        .from('claim_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('kind', 'claim_ip')
        .eq('key', ipKey)
        .gte('at', hourAgo)
      if (e2) throw e2
      if ((byIp ?? 0) >= PER_IP_PER_HOUR) {
        return json(429, { ok: false, error: 'Too many eggs from here this hour. Try again later.' })
      }
    }

    // Optional: if a carer is already signed in with the SAME email, link the egg now.
    let carerId: string | null = null
    const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (bearer.split('.').length === 3) {
      const { data } = await admin.auth.getUser(bearer)
      if (data.user?.email?.toLowerCase() === claim.email) carerId = data.user.id
    }

    // 4. Insert. Server decides ready_at. Duplicate id is refused, never overwritten.
    const readyAt = new Date(Date.now() + claim.waitMs).toISOString()
    const { error: insErr } = await admin.from('eggs').insert({
      id: claim.eggId,
      carer_id: carerId,
      ready_at: readyAt,
      status: 'waiting',
      story_id: claim.storyId,
      answers: claim.answers,
      email: claim.email,
      demo: claim.demo,
    })
    if (insErr) {
      if (insErr.code === '23505') return json(409, { ok: false, error: 'That egg was already claimed.' })
      throw insErr
    }

    const rows = [{ kind: 'claim_email', key: emailKey }]
    if (ipKey) rows.push({ kind: 'claim_ip', key: ipKey })
    const { error: logErr } = await admin.from('claim_attempts').insert(rows)
    if (logErr) console.error('claim-egg: could not record attempt', logErr.message)

    return json(200, { ok: true, id: claim.eggId, readyAt, slug: claim.answers.slug })
  } catch (err) {
    console.error('claim-egg failed:', err instanceof Error ? err.message : err)
    return json(500, { ok: false, error: 'Something went wrong. Please try again.' })
  }
})
