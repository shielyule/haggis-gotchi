/**
 * Photo Treat: the server checks the photo and gives the reward. Once per day.
 * Spec: .kiro/specs/photo-care (R1-R3, R6)
 *
 * Recognition: Amazon Rekognition (photo-care T7). Treat rules come from real answers
 * (_shared/photoMatch.ts). Without AWS secrets it falls back to placeholder mode
 * (any photo = "a mystery treat"). The photo is never stored, by us or by AWS.
 *
 * Deploy: supabase functions deploy photo-treat --no-verify-jwt
 * (checks the user's token itself)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { applyPhotoTreat, lifeStatus, wholeBars, type Haggling } from '../../../packages/care-engine/src/index.ts'
import { matchTreat, seenSummary, treatLine, type TreatId } from '../_shared/photoMatch.ts'
import { detect, rekognitionConfigured } from '../_shared/rekognition.ts'
import { localClock } from '../_shared/reminders.ts'
import { checkLine, cleanAiLine, fallbackReaction, reactionPrompt, REACTION_SYSTEM, safeLabels, safeName } from '../_shared/aiText.ts'
import { aiLine } from '../_shared/bedrock.ts'

const TEMPERAMENT_LABEL: Record<string, string> = { douce: 'Douce', skeigh: 'Skeigh', 'ill-trickit': 'Ill-trickit', ree: 'Ree', radge: 'Radge', 'fair-wud': 'Fair Wud' }

const CHECKS_PER_DAY = 10 // cost cap per carer (about $0.002 a check)

const MAX_BYTES = 2_500_000 // 1600 px JPEG from the phone; Rekognition allows 5 MB
const ORIGINS = [
  'https://haggisgotchi.com',
  'https://www.haggisgotchi.com',
  'https://haggis-gotchi-mother.pages.dev',
  'http://localhost:5173',
]

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

/** JPEG, PNG or WebP by file signature (not by name or declared type). */
export function imageKind(b: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
  if (
    b.length > 12 &&
    String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8, 12)) === 'WEBP'
  ) return 'webp'
  return null
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get('Origin'))
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json(405, { ok: false, error: 'POST only.' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.error('photo-treat: missing server configuration: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')
    return json(500, { ok: false, error: 'Treats are switched off for a moment.' })
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey)
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: auth } = token.split('.').length === 3 ? await admin.auth.getUser(token) : { data: { user: null } }
    if (!auth.user) return json(401, { ok: false, error: 'Sign in first.' })

    const form = await req.formData()
    const childId = String(form.get('childId') ?? '')
    const deviceId = String(form.get('deviceId') ?? '')
    const timezone = String(form.get('timezone') ?? 'Europe/London').slice(0, 64)
    const photo = form.get('photo')
    if (!(photo instanceof File)) return json(400, { ok: false, error: 'No photo arrived. Try again.' })
    if (photo.size > MAX_BYTES) return json(413, { ok: false, error: 'That photo is too big. Try again.' })
    const bytes = new Uint8Array(await photo.arrayBuffer())
    if (!imageKind(bytes)) return json(415, { ok: false, error: 'That is not a photo we can read.' })

    const { data: row, error } = await admin
      .from('children')
      .select('*')
      .eq('id', childId)
      .eq('carer_id', auth.user.id)
      .maybeSingle()
    if (error) throw error
    if (!row) return json(404, { ok: false, error: 'Haggling not found.' })
    if (row.departed_at) {
      return json(409, { ok: false, error: `${row.name} has gone to the glen.` })
    }
    if (row.home_device_id && row.home_device_id !== deviceId) {
      return json(409, { ok: false, error: `Photo Treats happen on ${row.name}'s home phone.` })
    }

    const today = localClock(timezone, Date.now()).date
    if (row.last_treat_day === today) {
      return json(200, {
        ok: false,
        error: `${row.name} has had today's treat already. Come back tomorrow!`,
      })
    }

    // Recognition. Real when AWS is configured; placeholder otherwise.
    let treatName = 'a mystery treat'
    let treatId: TreatId | null = null
    let seen: string[] = []
    let confidence: number | null = null
    const placeholder = rekognitionConfigured().length > 0
    if (!placeholder) {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString()
      const { count } = await admin
        .from('claim_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('kind', 'photo_check')
        .eq('key', auth.user.id)
        .gte('at', since)
      if ((count ?? 0) >= CHECKS_PER_DAY) {
        return json(200, { ok: false, error: `${row.name} has looked at enough photos for today. Try again tomorrow!` })
      }
      await admin.from('claim_attempts').insert({ kind: 'photo_check', key: auth.user.id })
      let detected
      try {
        detected = await detect(bytes)
      } catch (e) {
        console.error('photo-treat: recognition failed', e instanceof Error ? e.message : e)
        return json(200, { ok: false, error: `${row.name} could not see properly just now. Try again in a minute.` })
      }
      seen = seenSummary(detected)
      const match = matchTreat(detected)
      if (!match) {
        // Evidence for tuning: which words were read (product text on the photo).
        const read = detected.words
          .filter((w) => w.confidence >= 50 && /[A-Za-z]{2,}/.test(w.text))
          .slice(0, 8)
          .map((w) => w.text.replace(/[^\p{L}\p{N}'-]/gu, '').slice(0, 20))
          .filter(Boolean)
        console.log(`photo-treat: no match; labels=${seen.join('|')} words=${read.join('|')}`)
        // ai-haggling R4: "What's that?" A reaction to whatever it saw. Labels only (no photo, no people).
        // Bars unchanged, today's Photo Treat not used up.
        const labels = safeLabels(detected.labels)
        const name = safeName(row.name)
        const reaction = labels.length
          ? await aiLine(
              admin,
              'reaction',
              { system: REACTION_SYSTEM, prompt: reactionPrompt(row.name, TEMPERAMENT_LABEL[row.temperament_id] ?? 'wee', labels), maxTokens: 90 },
              (raw) => {
                const t = cleanAiLine(raw)
                return checkLine(t, name, 200) ? t : null
              },
              () => fallbackReaction(row.name, labels),
            )
          : { text: fallbackReaction(row.name, []), source: 'fallback' as const }
        const reactionScrap = { id: crypto.randomUUID(), at: new Date().toISOString(), text: reaction.text, kind: 'photo' }
        await admin.from('scrapbook_entries').insert({ ...reactionScrap, child_id: row.id, carer_id: auth.user.id })
        return json(200, {
          ok: false,
          seen,
          read,
          reaction: reaction.text,
          reactionScrap,
          hint: 'Not a Scottish treat, so the bars stay the same. Try shortbread, heather, tartan, bagpipes or an Irn-Bru can (turn the can so IRN BRU reads left to right).',
          error:
            `${row.name} squints. ${seen.length ? `That looks like ${seen.join(', ').toLowerCase()}, ` : ''}but it is not a Scottish treat. ` +
            (read.length ? `(Could read: ${read.join(' ')}.) ` : '(Could not read any words.) ') +
            'Irn-Bru writes sideways: turn your phone so IRN BRU reads left to right. Or try bagpipes, a kilt or tartan, heather or shortbread.',
        })
      }
      treatId = match.id
      treatName = match.name
      confidence = match.confidence
    }

    const h: Haggling = {
      eggId: row.egg_id,
      name: row.name,
      breakfastHour: row.breakfast_hour,
      dinnerHour: row.dinner_hour,
      bedHour: row.bed_hour,
      hunger: row.hunger,
      mood: row.mood,
      energy: row.energy,
      mess: row.mess,
      healthXp: row.health_xp ?? 50,
      lifeXp: Number(row.life_xp ?? 0),
      lastTickAt: row.last_tick_at,
      scrapbook: [],
      livingOn: 'phone',
    }
    const stage = lifeStatus(row.born_at ?? row.created_at, row.span_ends_at ?? undefined, Date.now()).stage
    const result = applyPhotoTreat(h, treatName, { temperamentId: row.temperament_id, nowMs: Date.now(), stage, timezone })
    if (!result.accepted) {
      return json(200, { ok: false, error: `${row.name} has had today's treat already.` })
    }
    const t = result.haggling
    const update = {
      ...wholeBars(t),
      health_xp: Math.max(-100, Math.min(100, Math.round(t.healthXp))),
      life_xp: Math.round((t.lifeXp ?? 0) * 100) / 100,
      last_treat_day: today,
      last_tick_at: t.lastTickAt,
    }
    // Conditional on the stored treat day, so two taps at once cannot both win.
    const { data: saved, error: upErr } = await admin
      .from('children')
      .update(update)
      .eq('id', row.id)
      .or(`last_treat_day.is.null,last_treat_day.neq.${today}`)
      .select('id')
    if (upErr) throw upErr
    if (!saved?.length) return json(200, { ok: false, error: `${row.name} has had today's treat already.` })

    // public-feed: record the treat (only this function may write 'photo_treat').
    await admin.from('check_ins').insert({
      child_id: row.id,
      carer_id: auth.user.id,
      surface: 'phone',
      ...wholeBars(t),
      action: 'photo_treat',
      treat_id: treatId,
    })

    const scrap = t.scrapbook[0]
    if (scrap) {
      await admin.from('scrapbook_entries').insert({
        id: scrap.id, child_id: row.id, carer_id: auth.user.id, at: scrap.at, text: scrap.text,
      })
    }
    const line = treatId ? treatLine(treatId, stage, row.name) : scrap?.text
    return json(200, { ok: true, treat: treatName, treatId, confidence, seen, line, placeholder, child: update, scrap })
  } catch (err) {
    console.error('photo-treat failed:', err instanceof Error ? err.message : err)
    return json(500, { ok: false, error: 'Something went wrong. Try again.' })
  }
})
