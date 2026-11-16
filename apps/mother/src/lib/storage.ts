import { pickStory } from '../data/birthStories'
import { temperamentForChaos } from '../data/temperaments'
import {
  addScrap,
  applyCare,
  tick,
  type CareAction,
  type EngineContext,
  type Haggling,
  type LivingSurface,
  type Notice,
  type ScrapEntry,
} from './engine'
import { notifyCare } from './notifications'
import { slugifyName } from './slug'

export type { CareAction, Haggling, LivingSurface, ScrapEntry }

const KEY = 'haggis-gotchi:v1'

export type SignupAnswers = {
  pet: string
  place: 'city' | 'town' | 'countryside' | 'seaside' | ''
  games: string
  comfortFood: string
  weatherDay: 'rainy' | 'beach' | 'forest' | ''
  familyQuirk: string
  chaos: number
  teenIdentityOptIn: boolean
  teenDisclaimerAck: boolean
  displayName: string
  /** URL nest: haggisgotchi.com/{slug} — Haggling never lives on `/`. */
  slug: string
  /** Carer email — used when the egg is ready (code) and to retrieve brood. */
  email: string
}

/** Packet the phone adopts. Same child id — never a clone. */
export type TransferPacket = {
  v: 1
  code: string
  createdAt: string
  egg: EggRecord
}

export type EggRecord = {
  id: string
  createdAt: string
  readyAt: string
  answers: SignupAnswers
  /** Which skeleton from birthStories.ts. Missing on eggs claimed before stories landed. */
  storyId?: string
  status: 'waiting' | 'ready' | 'hatched'
  /** Set when we emailed the ready / OTP code for this egg. */
  readyCodeSentAt?: string
  haggling?: Haggling
}

export type Store = {
  eggs: EggRecord[]
}

const empty: Store = { eggs: [] }

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...empty, eggs: [] }
    return JSON.parse(raw) as Store
  } catch {
    return { ...empty, eggs: [] }
  }
}

export function saveStore(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store))
}

function updateEgg(id: string, patch: (egg: EggRecord) => void): EggRecord | null {
  const store = loadStore()
  const egg = store.eggs.find((item) => item.id === id)
  if (!egg) return null
  patch(egg)
  saveStore(store)
  return egg
}

export function setEggStatus(
  id: string,
  status: EggRecord['status'],
): EggRecord | null {
  return updateEgg(id, (egg) => {
    egg.status = status
  })
}

export function updateEggCloudChildId(eggId: string, cloudChildId: string) {
  updateEgg(eggId, (egg) => {
    if (egg.haggling) egg.haggling.cloudChildId = cloudChildId
  })
}

/** Replace local brood with cloud snapshot (keeps offline eggs if pull fails). */
export function replaceLocalBrood(eggs: EggRecord[]) {
  saveStore({ eggs })
}

export function claimEgg(answers: SignupAnswers, waitMs = 30 * 60 * 1000): EggRecord {
  const store = loadStore()
  const created = Date.now()
  const slug =
    answers.slug?.trim() ||
    slugifyName(answers.displayName) ||
    'carer'
  const egg: EggRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date(created).toISOString(),
    readyAt: new Date(created + waitMs).toISOString(),
    answers: { ...answers, slug },
    storyId: pickStory(answers).id,
    status: 'waiting',
  }
  store.eggs.unshift(egg)
  saveStore(store)
  return egg
}

export function eggSlug(egg: EggRecord): string {
  return egg.answers.slug?.trim() || slugifyName(egg.answers.displayName)
}

export function findEggsBySlug(eggs: EggRecord[], slug: string): EggRecord[] {
  const want = slug.trim().toLowerCase()
  return eggs.filter((e) => eggSlug(e) === want)
}

export function nameHaggling(
  eggId: string,
  name: string,
  breakfastHour: number,
  dinnerHour: number,
  bedHour: number,
): EggRecord | null {
  return updateEgg(eggId, (egg) => {
    const temp = temperamentForChaos(egg.answers.chaos)
    const now = new Date().toISOString()
    egg.haggling = {
      eggId,
      name: name.trim() || 'Wee Yin',
      breakfastHour,
      dinnerHour,
      bedHour,
      hunger: 72,
      mood: 78,
      energy: 70,
      mess: 12,
      healthXp: 50,
      lastCleanAt: now,
      lastTickAt: now,
      livingOn: 'mother',
      scrapbook: [
        {
          id: crypto.randomUUID(),
          at: now,
          text: `${name.trim() || 'Wee Yin'} hatched ${temp.label.toLowerCase()}. The scrapbook begins.`,
        },
      ],
    }
  })
}

const TRANSFER_KEY = 'haggis-gotchi:transfers:v1'
const PHONE_KEY = 'haggis-gotchi:phone:v1'

type TransferVault = Record<string, TransferPacket>

function loadTransfers(): TransferVault {
  try {
    const raw = localStorage.getItem(TRANSFER_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as TransferVault
  } catch {
    return {}
  }
}

function saveTransfers(vault: TransferVault) {
  localStorage.setItem(TRANSFER_KEY, JSON.stringify(vault))
}

function makeTransferCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): string {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const bin = atob(padded + pad)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeTransferPacket(packet: TransferPacket): string {
  return toBase64Url(JSON.stringify(packet))
}

export function decodeTransferPacket(token: string): TransferPacket | null {
  try {
    const parsed = JSON.parse(fromBase64Url(token)) as TransferPacket
    if (parsed?.v !== 1 || !parsed.egg?.haggling) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Mint a phone handoff for a named Haggling.
 * Mother keeps the brood row; living care moves to phone once claimed.
 * Link carries the full packet (works across devices before cloud sync).
 */
export function mintPhoneTransfer(eggId: string): {
  code: string
  token: string
  packet: TransferPacket
} | null {
  const store = loadStore()
  const egg = store.eggs.find((e) => e.id === eggId)
  if (!egg?.haggling) return null

  const code = makeTransferCode()
  const now = new Date().toISOString()
  const packet: TransferPacket = {
    v: 1,
    code,
    createdAt: now,
    egg: structuredClone(egg),
  }

  const vault = loadTransfers()
  vault[code] = packet
  saveTransfers(vault)

  updateEgg(eggId, (e) => {
    if (!e.haggling) return
    e.haggling.transferCode = code
    e.haggling.sentToPhoneAt = now
    e.haggling.livingOn = 'phone'
    addScrap(
      e.haggling,
      `${e.haggling.name} packed for the phone. Mother keeps the brood record — not a second pet.`,
    )
  })

  return { code, token: encodeTransferPacket(packet), packet }
}

export function lookupTransferCode(code: string): TransferPacket | null {
  const vault = loadTransfers()
  return vault[code.trim().toUpperCase()] ?? null
}

export type PhoneStore = {
  child: EggRecord | null
}

export function loadPhoneStore(): PhoneStore {
  try {
    const raw = localStorage.getItem(PHONE_KEY)
    if (!raw) return { child: null }
    return JSON.parse(raw) as PhoneStore
  } catch {
    return { child: null }
  }
}

export function savePhoneStore(store: PhoneStore) {
  localStorage.setItem(PHONE_KEY, JSON.stringify(store))
}

/** Phone adopts the packet. Same egg id — replaces any prior phone child. */
export function claimOnPhone(
  input: string,
): { ok: true; egg: EggRecord } | { ok: false; error: string } {
  const trimmed = input.trim()
  let packet: TransferPacket | null = null

  if (trimmed.length <= 12 && !trimmed.includes('.')) {
    packet = lookupTransferCode(trimmed.toUpperCase())
  }
  if (!packet) packet = decodeTransferPacket(trimmed)
  if (!packet && trimmed.includes('#')) {
    const hash = trimmed.split('#')[1] ?? ''
    const token = hash.replace(/^\/?c\//, '').replace(/^c\//, '')
    packet = decodeTransferPacket(token)
  }
  if (!packet) {
    return {
      ok: false,
      error:
        'Could not read that claim. Paste the full link from Mother, or the code if you opened Mother on this same browser.',
    }
  }

  const egg = structuredClone(packet.egg)
  if (!egg.haggling) {
    return { ok: false, error: 'That packet has no Haggling yet.' }
  }
  egg.haggling.livingOn = 'phone'
  addScrap(
    egg.haggling,
    `${egg.haggling.name} arrived on the phone. Care continues here.`,
  )
  egg.haggling.lastTickAt = new Date().toISOString()
  savePhoneStore({ child: egg })
  return { ok: true, egg }
}

/** Apply care mutations against the phone-local child. */
export function updatePhoneChild(patch: (egg: EggRecord) => void): EggRecord | null {
  const store = loadPhoneStore()
  if (!store.child) return null
  patch(store.child)
  savePhoneStore(store)
  return store.child
}

function engineContext(egg: EggRecord, nowMs = Date.now()): EngineContext {
  return { temperamentId: temperamentForChaos(egg.answers.chaos).id, nowMs }
}

function showNotices(notices: Notice[]) {
  for (const n of notices) notifyCare(n.title, n.body, n.tag)
}

/** Phone: advance vitals using the shared care engine (one set of rules, everywhere). */
export function tickPhoneChild(nowMs = Date.now()): EggRecord | null {
  const store = loadPhoneStore()
  const egg = store.child
  if (!egg?.haggling) return null
  const result = tick(egg.haggling, engineContext(egg, nowMs))
  egg.haggling = result.haggling
  savePhoneStore(store)
  showNotices(result.notices)
  return egg
}

export function carePhoneAction(action: CareAction): EggRecord | null {
  let notices: Notice[] = []
  const egg = updatePhoneChild((child) => {
    if (!child.haggling) return
    const result = applyCare(child.haggling, action, engineContext(child))
    child.haggling = result.haggling
    notices = result.notices
  })
  showNotices(notices)
  return egg
}

/** Format 0–23 as 12-hour clock, e.g. "8:00 AM". */
export function formatClockHour(hour: number): string {
  const h = ((Math.round(hour) % 24) + 24) % 24
  const period = h < 12 ? 'AM' : 'PM'
  const twelve = h % 12 === 0 ? 12 : h % 12
  return `${twelve}:00 ${period}`
}

/** Mother/nest: advance vitals using the shared care engine. */
export function tickHaggling(eggId: string, nowMs = Date.now()): EggRecord | null {
  let notices: Notice[] = []
  const egg = updateEgg(eggId, (e) => {
    if (!e.haggling) return
    const result = tick(e.haggling, engineContext(e, nowMs))
    e.haggling = result.haggling
    notices = result.notices
  })
  showNotices(notices)
  return egg
}

export function careAction(eggId: string, action: CareAction): EggRecord | null {
  let notices: Notice[] = []
  const egg = updateEgg(eggId, (e) => {
    if (!e.haggling) return
    const result = applyCare(e.haggling, action, engineContext(e))
    e.haggling = result.haggling
    notices = result.notices
  })
  showNotices(notices)
  return egg
}

export function moodLabel(mood: number): string {
  if (mood >= 75) return 'Fair chuffed'
  if (mood >= 55) return 'Content enough'
  if (mood >= 35) return 'Peely-wally'
  return 'Distressed'
}

export const defaultAnswers = (): SignupAnswers => ({
  pet: '',
  place: '',
  games: '',
  comfortFood: '',
  weatherDay: '',
  familyQuirk: '',
  chaos: 50,
  teenIdentityOptIn: false,
  teenDisclaimerAck: false,
  displayName: '',
  slug: '',
  email: '',
})

/** Brood list: still with mother (not collected onto phone). */
export function eggsInBrood(eggs: EggRecord[]): EggRecord[] {
  return eggs.filter((e) => e.haggling?.livingOn !== 'phone')
}

/** Collected onto phone — hidden from brood until retrieved. */
export function eggsOnPhone(eggs: EggRecord[]): EggRecord[] {
  return eggs.filter((e) => e.haggling?.livingOn === 'phone')
}

export function markReadyCodeSent(eggId: string): EggRecord | null {
  return updateEgg(eggId, (egg) => {
    egg.readyCodeSentAt = new Date().toISOString()
  })
}
