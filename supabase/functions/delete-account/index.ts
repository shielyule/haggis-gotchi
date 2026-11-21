/**
 * Delete my account (privacy review, 22 Nov). Signed-in carer only.
 * Body: { confirm: "DELETE" }. Deletes the auth user; every table cascades from
 * auth.users -> carers -> eggs, children, check-ins, scrapbook, push subscriptions,
 * weather readings and graveyard stones. Nothing is kept.
 *
 * Deploy: supabase functions deploy delete-account --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const ORIGINS = ['https://haggisgotchi.com', 'https://www.haggisgotchi.com', 'https://haggis-gotchi-mother.pages.dev', 'http://localhost:5173']

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
    console.error('delete-account: missing server configuration: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')
    return json(500, { error: 'Server not configured' })
  }
  const admin = createClient(supabaseUrl, serviceKey)
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: auth } = token.split('.').length === 3 ? await admin.auth.getUser(token) : { data: { user: null } }
    if (!auth.user) return json(401, { error: 'Sign in first.' })
    const body = (await req.json().catch(() => ({}))) as { confirm?: unknown }
    if (body.confirm !== 'DELETE') return json(400, { error: 'Type DELETE to confirm.' })
    const { error } = await admin.auth.admin.deleteUser(auth.user.id)
    if (error) throw error
    console.log('delete-account: deleted one carer') // no ids or emails in logs
    return json(200, { ok: true })
  } catch (err) {
    console.error('delete-account failed:', err instanceof Error ? err.message : err)
    return json(500, { error: 'Could not delete the account. Email hello@haggisgotchi.com and we will do it by hand.' })
  }
})
