import { pickStory } from '../data/birthStories'
import {
  temperamentForChaos,
  type MemoryFilm,
} from '../data/temperaments'
import {
  applyHealthRules,
  ensureHealth,
  penaliseMissedSchedule,
  sootheHealth,
} from './health'

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
}

export type ScrapEntry = {
  id: string
  at: string
  text: string
}

export type CareAction = 'feed' | 'cuddle' | 'walk' | 'treat' | 'clean'

/** Where the living care surface is right now. Mother keeps the brood record either way. */
export type LivingSurface = 'mother' | 'phone'

export type Haggling = {
  eggId: string
  name: string
  /** Supabase children.id when cloud-synced */
  cloudChildId?: string
  /** 0–23 local hour for breakfast window */
  breakfastHour: number
  /** 0–23 local hour for dinner window */
  dinnerHour: number
  bedHour: number
  hunger: number
  mood: number
  energy: number
  mess: number
  /** Can go negative → sick (red). */
  healthXp: number
  sick?: boolean
  hungerZeroAt?: string
  moodZeroAt?: string
  messHighAt?: string
  lastCleanAt?: string
  alertFlags?: {
    hungerZeroNotified: boolean
    moodZeroNotified: boolean
    messWarnNotified: boolean
    hungerPenaltyDone: boolean
    moodPenaltyDone: boolean
    messPenaltyDone: boolean
  }
  lastTickAt: string
  lastFeedAt?: string
  lastBedAt?: string
  scrapbook: ScrapEntry[]
  /** Extra rewatchable clips beyond the hatch film (growth moments later). */
  memoryFilms?: MemoryFilm[]
  /** Care happens here; mother brood never becomes a second pet. */
  livingOn: LivingSurface
  /** Short human code shown when sending to phone (e.g. BRAW7K). */
  transferCode?: string
  sentToPhoneAt?: string
  /** Legacy single feed hour — migrated on tick/name */
  feedHour?: number
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
  const egg: EggRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date(created).toISOString(),
    readyAt: new Date(created + waitMs).toISOString(),
    answers,
    storyId: pickStory(answers).id,
    status: 'waiting',
  }
  store.eggs.unshift(egg)
  saveStore(store)
  return egg
}

function addScrap(haggling: Haggling, text: string) {
  haggling.scrapbook.unshift({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    text,
  })
  if (haggling.scrapbook.length > 40) haggling.scrapbook.length = 40
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

export function tickPhoneChild(nowMs = Date.now()): EggRecord | null {
  const store = loadPhoneStore()
  const egg = store.child
  if (!egg?.haggling) return null
  // Reuse mother tick by writing through a temp id path is messy; inline same decay.
  const h = egg.haggling
  ensureMeals(h)
  const last = new Date(h.lastTickAt).getTime()
  const hours = Math.max(0, (nowMs - last) / (1000 * 60 * 60))
  if (hours < 0.02) return egg

  const temp = temperamentForChaos(egg.answers.chaos)
  const wild = temp.id === 'fair-wud' || temp.id === 'radge' || temp.id === 'ree' ? 1.15 : 1
  const calm = temp.id === 'douce' ? 0.85 : 1

  h.hunger = clamp(h.hunger - hours * 9 * wild)
  h.energy = clamp(h.energy - hours * 6 * calm)
  h.mess = clamp(h.mess + hours * 5 * wild)
  h.mood = clamp(h.mood - hours * 4)

  const startHour = new Date(last).getHours()
  const endHour = new Date(nowMs).getHours()
  const crossed = (target: number) => {
    if (hours >= 24) return true
    if (startHour === endHour && hours < 1) return false
    if (startHour < endHour) return target > startHour && target <= endHour
    return target > startHour || target <= endHour
  }

  if (crossed(h.breakfastHour) && h.hunger < 55) {
    h.mood = clamp(h.mood - 12)
    penaliseMissedSchedule(h, 'breakfast')
  }
  if (crossed(h.dinnerHour) && h.hunger < 55) {
    h.mood = clamp(h.mood - 12)
    penaliseMissedSchedule(h, 'dinner')
  }
  if (crossed(h.bedHour) && h.energy < 45) {
    h.mood = clamp(h.mood - 10)
    penaliseMissedSchedule(h, 'bedtime')
  }

  if (h.hunger < 25) h.mood = clamp(h.mood - 3)
  if (h.mess > 70) h.mood = clamp(h.mood - 4)

  applyHealthRules(h, nowMs)
  h.lastTickAt = new Date(nowMs).toISOString()
  savePhoneStore(store)
  return egg
}

export function carePhoneAction(action: CareAction): EggRecord | null {
  tickPhoneChild()
  return updatePhoneChild((egg) => {
    const h = egg.haggling
    if (!h) return
    ensureMeals(h)
    const now = new Date()
    const hour = now.getHours()
    const nearBreakfast = nearHour(hour, h.breakfastHour)
    const nearDinner = nearHour(hour, h.dinnerHour)
    const nearFeed = nearBreakfast || nearDinner
    const nearBed = nearHour(hour, h.bedHour)
    const mealLabel = nearBreakfast ? 'breakfast' : nearDinner ? 'dinner' : null

    switch (action) {
      case 'feed':
        h.hunger = clamp(h.hunger + 28)
        h.mood = clamp(h.mood + (nearFeed ? 14 : 6))
        h.mess = clamp(h.mess + 8)
        h.lastFeedAt = now.toISOString()
        sootheHealth(h, nearFeed ? 4 : 2)
        addScrap(
          h,
          mealLabel
            ? `Fed ${h.name} at ${mealLabel}. Pure delight.`
            : `Fed ${h.name} between meals. Still grateful, a bit confused.`,
        )
        break
      case 'cuddle':
        h.mood = clamp(h.mood + 12)
        h.energy = clamp(h.energy + 4)
        sootheHealth(h, 3)
        addScrap(h, `A cuddle. ${h.name} went soft as a clootie dumpling.`)
        break
      case 'walk':
        h.energy = clamp(h.energy - 10)
        h.mood = clamp(h.mood + 10)
        h.hunger = clamp(h.hunger - 6)
        h.mess = clamp(h.mess + 5)
        sootheHealth(h, 2)
        addScrap(h, `A walk. ${h.name} came back with heather in the fur.`)
        break
      case 'treat':
        h.mood = clamp(h.mood + 16)
        h.hunger = clamp(h.hunger + 8)
        h.mess = clamp(h.mess + 4)
        sootheHealth(h, 2)
        addScrap(h, `A treat. ${h.name} did a wee dance of nonsense.`)
        break
      case 'clean':
        h.mess = clamp(h.mess - 35)
        h.mood = clamp(h.mood + (h.mess < 40 ? 8 : 3))
        h.lastCleanAt = now.toISOString()
        h.messHighAt = undefined
        sootheHealth(h, 5)
        addScrap(h, `Cleaned up after ${h.name}. The room smells of rain again.`)
        break
    }

    if (nearBed && action === 'cuddle') {
      h.energy = clamp(h.energy + 12)
      h.lastBedAt = now.toISOString()
      sootheHealth(h, 3)
      addScrap(h, `Bedtime cuddle. ${h.name} settled.`)
    }

    applyHealthRules(h, now.getTime())
    h.lastTickAt = now.toISOString()
  })
}

/** Migrate old single-feed saves → breakfast + dinner. */
function ensureMeals(h: Haggling) {
  if (typeof h.breakfastHour !== 'number') {
    h.breakfastHour = typeof h.feedHour === 'number' ? h.feedHour : 8
  }
  if (typeof h.dinnerHour !== 'number') {
    h.dinnerHour = 18
  }
  if (!h.livingOn) h.livingOn = 'mother'
  ensureHealth(h)
}

function nearHour(hour: number, target: number) {
  return Math.abs(hour - target) <= 1 || Math.abs(hour - target) >= 23
}

/** Format 0–23 as 12-hour clock, e.g. "8:00 AM". */
export function formatClockHour(hour: number): string {
  const h = ((Math.round(hour) % 24) + 24) % 24
  const period = h < 12 ? 'AM' : 'PM'
  const twelve = h % 12 === 0 ? 12 : h % 12
  return `${twelve}:00 ${period}`
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** Advance vitals from lastTickAt → now. Missed feed/bed windows hurt mood. */
export function tickHaggling(eggId: string, nowMs = Date.now()): EggRecord | null {
  return updateEgg(eggId, (egg) => {
    const h = egg.haggling
    if (!h) return
    ensureMeals(h)
    const last = new Date(h.lastTickAt).getTime()
    const hours = Math.max(0, (nowMs - last) / (1000 * 60 * 60))
    if (hours < 0.02) return

    const temp = temperamentForChaos(egg.answers.chaos)
    const wild = temp.id === 'fair-wud' || temp.id === 'radge' || temp.id === 'ree' ? 1.15 : 1
    const calm = temp.id === 'douce' ? 0.85 : 1

    h.hunger = clamp(h.hunger - hours * 9 * wild)
    h.energy = clamp(h.energy - hours * 6 * calm)
    h.mess = clamp(h.mess + hours * 5 * wild)
    h.mood = clamp(h.mood - hours * 4)

    // Missed breakfast / dinner / bed windows since last tick
    const startHour = new Date(last).getHours()
    const endHour = new Date(nowMs).getHours()
    const crossed = (target: number) => {
      if (hours >= 24) return true
      if (startHour === endHour && hours < 1) return false
      if (startHour < endHour) return target > startHour && target <= endHour
      return target > startHour || target <= endHour
    }

    if (crossed(h.breakfastHour) && h.hunger < 55) {
      h.mood = clamp(h.mood - 12)
      penaliseMissedSchedule(h, 'breakfast')
    }
    if (crossed(h.dinnerHour) && h.hunger < 55) {
      h.mood = clamp(h.mood - 12)
      penaliseMissedSchedule(h, 'dinner')
    }
    if (crossed(h.bedHour) && h.energy < 45) {
      h.mood = clamp(h.mood - 10)
      penaliseMissedSchedule(h, 'bedtime')
    }

    if (h.hunger < 25) h.mood = clamp(h.mood - 3)
    if (h.mess > 70) h.mood = clamp(h.mood - 4)

    applyHealthRules(h, nowMs)
    h.lastTickAt = new Date(nowMs).toISOString()
  })
}

export function careAction(eggId: string, action: CareAction): EggRecord | null {
  tickHaggling(eggId)
  return updateEgg(eggId, (egg) => {
    const h = egg.haggling
    if (!h) return
    ensureMeals(h)
    const now = new Date()
    const hour = now.getHours()
    const nearBreakfast = nearHour(hour, h.breakfastHour)
    const nearDinner = nearHour(hour, h.dinnerHour)
    const nearFeed = nearBreakfast || nearDinner
    const nearBed = nearHour(hour, h.bedHour)
    const mealLabel = nearBreakfast ? 'breakfast' : nearDinner ? 'dinner' : null

    switch (action) {
      case 'feed':
        h.hunger = clamp(h.hunger + 28)
        h.mood = clamp(h.mood + (nearFeed ? 14 : 6))
        h.mess = clamp(h.mess + 8)
        h.lastFeedAt = now.toISOString()
        sootheHealth(h, nearFeed ? 4 : 2)
        addScrap(
          h,
          mealLabel
            ? `Fed ${h.name} at ${mealLabel}. Pure delight.`
            : `Fed ${h.name} between meals. Still grateful, a bit confused.`,
        )
        break
      case 'cuddle':
        h.mood = clamp(h.mood + 12)
        h.energy = clamp(h.energy + 4)
        sootheHealth(h, 3)
        addScrap(h, `A cuddle. ${h.name} went soft as a clootie dumpling.`)
        break
      case 'walk':
        h.energy = clamp(h.energy - 10)
        h.mood = clamp(h.mood + 10)
        h.hunger = clamp(h.hunger - 6)
        h.mess = clamp(h.mess + 5)
        sootheHealth(h, 2)
        addScrap(h, `A walk. ${h.name} came back with heather in the fur.`)
        break
      case 'treat':
        h.mood = clamp(h.mood + 16)
        h.hunger = clamp(h.hunger + 8)
        h.mess = clamp(h.mess + 4)
        sootheHealth(h, 2)
        addScrap(h, `A treat. ${h.name} did a wee dance of nonsense.`)
        break
      case 'clean':
        h.mess = clamp(h.mess - 35)
        h.mood = clamp(h.mood + (h.mess < 40 ? 8 : 3))
        h.lastCleanAt = now.toISOString()
        h.messHighAt = undefined
        sootheHealth(h, 5)
        addScrap(h, `Cleaned up after ${h.name}. The room smells of rain again.`)
        break
    }

    if (nearBed && action === 'cuddle') {
      h.energy = clamp(h.energy + 12)
      h.lastBedAt = now.toISOString()
      sootheHealth(h, 3)
      addScrap(h, `Bedtime cuddle. ${h.name} settled.`)
    }

    applyHealthRules(h, now.getTime())
    h.lastTickAt = now.toISOString()
  })
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
})
