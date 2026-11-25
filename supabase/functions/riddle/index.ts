/**
 * Daily Scottish folklore riddle (spec ai-haggling R5). Signed-in carers only.
 *   POST { action: "get", childId? }           -> today's riddle (question + 3 answers), and this Haggling's guess if made
 *   POST { action: "guess", childId, choice }  -> right or wrong, the answer, why; one guess per Haggling per day
 * The riddle is written once a day by Amazon Nova from the topic list (checked), or taken from the
 * written bank. The answer stays on the server until a guess is made.
 *
 * Deploy: supabase functions deploy riddle --no-verify-jwt
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { localTime } from '../../../packages/care-engine/src/index.ts'
import { safeName } from '../_shared/aiText.ts'
import { aiLine } from '../_shared/ai.ts'
import { arrange, parseRiddle, RIDDLE_SYSTEM, riddleFor, riddlePrompt, topicFor, type Riddle } from '../_shared/riddles.ts'

const ORIGINS = ['https://haggisgotchi.com', 'https://www.haggisgotchi.com', 'https://haggis-gotchi-mother.pages.dev', 'http://localhost:5173']

type Row = { day: string; topic: string; question: string; options: string[]; answer: number; explain: string; source: string }

/** Today's riddle, making it if this is the first ask of the day (R5.2). Same for everyone. */
async function todaysRiddle(admin: SupabaseClient, day: string): Promise<Row> {
  const { data: have } = await admin.from('daily_riddles').select('*').eq('day', day).maybeSingle()
  if (have) return have as Row
  const topic = topicFor(day)
  let made: Riddle = riddleFor(day)
  let source: 'ai' | 'bank' = 'bank'
  const r = await aiLine(
    admin,
    'riddle',
    { system: RIDDLE_SYSTEM, prompt: riddlePrompt(day), maxTokens: 300, temperature: 0.7 },
    (raw) => {
      const p = parseRiddle(raw, topic)
      return p ? JSON.stringify(arrange(p, day)) : null
    },
    () => JSON.stringify(made),
  )
  if (r.source === 'ai') {
    made = JSON.parse(r.text) as Riddle
    source = 'ai'
  }
  await admin.from('daily_riddles').upsert({ day, topic: made.topic, question: made.question, options: made.options, answer: made.answer, explain: made.explain, source }, { onConflict: 'day', ignoreDuplicates: true })
  const { data } = await admin.from('daily_riddles').select('*').eq('day', day).single()
  return data as Row
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
    console.error('riddle: missing server configuration: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')
    return json(500, { error: 'Server not configured' })
  }
  const admin = createClient(supabaseUrl, serviceKey)
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: auth } = token.split('.').length === 3 ? await admin.auth.getUser(token) : { data: { user: null } }
    if (!auth.user) return json(401, { error: 'Sign in first.' })
    const body = (await req.json().catch(() => ({}))) as { action?: string; childId?: string; choice?: unknown }
    // One riddle per UK day for everyone (the game's home time zone).
    const day = localTime(Date.now(), 'Europe/London').date
    const riddle = await todaysRiddle(admin, day)
    const childId = typeof body.childId === 'string' ? body.childId : ''
    const { data: child } = childId
      ? await admin.from('children').select('id, carer_id, name, departed_at').eq('id', childId).eq('carer_id', auth.user.id).maybeSingle()
      : { data: null }
    const reveal = (choice: number, correct: boolean) => ({ choice, correct, answer: riddle.answer, explain: riddle.explain })
    const publicPart = { day, topic: riddle.topic, question: riddle.question, options: riddle.options }

    if (body.action === 'guess') {
      if (!child) return json(404, { error: 'Haggling not found.' })
      if (child.departed_at) return json(409, { error: `${child.name} has gone to the glen.` })
      const choice = Number(body.choice)
      if (!Number.isInteger(choice) || choice < 0 || choice > 2) return json(400, { error: 'Pick one of the three answers.' })
      const correct = choice === riddle.answer
      const { error: dup } = await admin.from('riddle_guesses').insert({ child_id: child.id, carer_id: auth.user.id, day, choice, correct })
      if (dup) {
        const { data: prev } = await admin.from('riddle_guesses').select('choice, correct').eq('child_id', child.id).eq('day', day).single()
        return json(200, { ...publicPart, already: true, guess: reveal(prev!.choice, prev!.correct) })
      }
      const n = safeName(child.name as string)
      const text = correct
        ? `${n} solved today's riddle: ${riddle.options[riddle.answer]}! ${riddle.explain}`
        : `${n} had a go at today's riddle. The answer was ${riddle.options[riddle.answer]}. ${riddle.explain}`
      const scrap = { id: crypto.randomUUID(), at: new Date().toISOString(), text, kind: 'riddle' }
      await admin.from('scrapbook_entries').insert({ ...scrap, child_id: child.id, carer_id: auth.user.id })
      return json(200, { ...publicPart, guess: reveal(choice, correct), scrap })
    }

    // "get": include this Haggling's guess if it already made one today.
    let guess = null
    if (child) {
      const { data: prev } = await admin.from('riddle_guesses').select('choice, correct').eq('child_id', child.id).eq('day', day).maybeSingle()
      if (prev) guess = reveal(prev.choice, prev.correct)
    }
    return json(200, { ...publicPart, guess })
  } catch (err) {
    console.error('riddle failed:', err instanceof Error ? err.message : err)
    return json(500, { error: 'Internal error' })
  }
})
