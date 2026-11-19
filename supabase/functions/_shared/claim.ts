/**
 * Validation for claiming an egg. Pure: runs under node --test and in Edge Functions.
 * Spec: .kiro/specs/security-hardening R1.3, R4.1
 */
import { cleanDisplayName, isPlausibleEmail, safeSlug } from './email.ts'

export const DEMO_WAIT_MS = 20 * 1000 // owner, 19 Nov: 20 s demo wait
export const FULL_WAIT_MS = 30 * 60 * 1000
export const MAX_ANSWERS_BYTES = 4096

const PLACES = ['', 'city', 'town', 'countryside', 'seaside'] as const
const DAYS = ['', 'rainy', 'beach', 'forest'] as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const STORY_RE = /^[a-z0-9-]{3,48}$/

/** Fields the client may send. Anything else is rejected, not ignored. */
const ALLOWED_KEYS = new Set([
  'displayName',
  'email',
  'slug',
  'pet',
  'place',
  'games',
  'comfortFood',
  'weatherDay',
  'familyQuirk',
  'chaos',
  'teenIdentityOptIn',
  'teenDisclaimerAck',
])

export type CleanAnswers = {
  displayName: string
  slug: string
  pet: string
  place: (typeof PLACES)[number]
  games: string
  comfortFood: string
  weatherDay: (typeof DAYS)[number]
  familyQuirk: string
  chaos: number
  teenIdentityOptIn: boolean
  teenDisclaimerAck: boolean
}

export type ClaimInput = {
  eggId: string
  storyId: string | null
  waitMs: number
  email: string
  /** Answers WITHOUT the email: email lives only in eggs.email (R4.1). */
  answers: CleanAnswers
}

export type ClaimValidation = { ok: true; value: ClaimInput } | { ok: false; error: string }

function text(v: unknown, max: number): string | null {
  if (v === undefined || v === null) return ''
  if (typeof v !== 'string') return null
  // Strip control characters, collapse whitespace.
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  return s.length > max ? null : s
}

export function validateClaim(body: unknown): ClaimValidation {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Bad request.' }
  }
  const b = body as Record<string, unknown>

  const eggId = typeof b.eggId === 'string' ? b.eggId.toLowerCase() : ''
  if (!UUID_RE.test(eggId)) return { ok: false, error: 'Bad request.' }

  const storyId = b.storyId === undefined || b.storyId === null ? null : b.storyId
  if (storyId !== null && (typeof storyId !== 'string' || !STORY_RE.test(storyId))) {
    return { ok: false, error: 'Bad request.' }
  }

  const waitMs = b.demo === true ? DEMO_WAIT_MS : FULL_WAIT_MS

  const a = b.answers
  if (!a || typeof a !== 'object' || Array.isArray(a)) {
    return { ok: false, error: 'Bad request.' }
  }
  if (new TextEncoder().encode(JSON.stringify(a)).length > MAX_ANSWERS_BYTES) {
    return { ok: false, error: 'Your answers are too long.' }
  }
  const raw = a as Record<string, unknown>
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(key)) return { ok: false, error: 'Bad request.' }
  }

  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : ''
  if (!isPlausibleEmail(email)) {
    return { ok: false, error: 'Please enter a real email address.' }
  }

  const name = text(raw.displayName, 40)
  if (!name) return { ok: false, error: 'Please tell us what to call you (40 letters max).' }

  const pet = text(raw.pet, 120)
  const games = text(raw.games, 120)
  const comfortFood = text(raw.comfortFood, 120)
  const familyQuirk = text(raw.familyQuirk, 200)
  if (pet === null || games === null || comfortFood === null || familyQuirk === null) {
    return { ok: false, error: 'One of your answers is too long.' }
  }

  const place = raw.place ?? ''
  const weatherDay = raw.weatherDay ?? ''
  if (!PLACES.includes(place as never) || !DAYS.includes(weatherDay as never)) {
    return { ok: false, error: 'Bad request.' }
  }

  const chaos = raw.chaos
  if (typeof chaos !== 'number' || !Number.isInteger(chaos) || chaos < 0 || chaos > 100) {
    return { ok: false, error: 'Bad request.' }
  }

  for (const k of ['teenIdentityOptIn', 'teenDisclaimerAck']) {
    if (raw[k] !== undefined && typeof raw[k] !== 'boolean') {
      return { ok: false, error: 'Bad request.' }
    }
  }

  return {
    ok: true,
    value: {
      eggId,
      storyId: storyId as string | null,
      waitMs,
      email,
      answers: {
        displayName: cleanDisplayName(name),
        slug: safeSlug(raw.slug, name),
        pet,
        place: place as CleanAnswers['place'],
        games,
        comfortFood,
        weatherDay: weatherDay as CleanAnswers['weatherDay'],
        familyQuirk,
        chaos,
        teenIdentityOptIn: raw.teenIdentityOptIn === true,
        teenDisclaimerAck: raw.teenDisclaimerAck === true,
      },
    },
  }
}

/** First address in X-Forwarded-For, else empty. Used only for rate limiting. */
export function clientIp(forwardedFor: string | null | undefined): string {
  const first = (forwardedFor ?? '').split(',')[0]?.trim() ?? ''
  return first.slice(0, 64)
}
