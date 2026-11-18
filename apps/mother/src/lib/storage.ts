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

// v2 = clean slate after security-hardening T4/T5 (16 Nov 2026). Old v1 data is dropped.
const KEY = 'haggis-gotchi:v2'

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

/**
 * Build (do not save) a new egg. The cloud claim (claim-egg Edge Function) decides
 * the real ready time; call saveNewEgg only after it accepts the claim.
 */
export function newEggRecord(answers: SignupAnswers, waitMs = 30 * 60 * 1000): EggRecord {
  const created = Date.now()
  const slug = answers.slug?.trim() || slugifyName(answers.displayName) || 'carer'
  return {
    id: crypto.randomUUID(),
    createdAt: new Date(created).toISOString(),
    readyAt: new Date(created + waitMs).toISOString(),
    answers: { ...answers, slug },
    storyId: pickStory(answers).id,
    status: 'waiting',
  }
}

export function saveNewEgg(egg: EggRecord): EggRecord {
  const store = loadStore()
  store.eggs = [egg, ...store.eggs.filter((e) => e.id !== egg.id)]
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
      hatchedAt: now,
      bornAt: now, // server sets the authoritative dates (lifespan-graveyard)
      spanEndsAt: new Date(Date.parse(now) + 42 * 86_400_000).toISOString(),
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

const PHONE_KEY = 'haggis-gotchi:phone:v2'

/** Old builds kept claim codes in this browser key. Codes now live only on the server. */
const LEGACY_KEYS = [
  'haggis-gotchi:v1',
  'haggis-gotchi:phone:v1',
  'haggis-gotchi:transfers:v1',
]
try {
  for (const k of LEGACY_KEYS) localStorage.removeItem(k)
} catch {
  // storage unavailable
}

/** Record the server-minted claim code on the nest copy (display only). */
export function setTransferCode(eggId: string, code: string | undefined): EggRecord | null {
  return updateEgg(eggId, (e) => {
    if (!e.haggling) return
    if (code) {
      e.haggling.transferCode = code
      e.haggling.sentToPhoneAt = new Date().toISOString()
    } else {
      delete e.haggling.transferCode
    }
  })
}

/** Mirror where the cloud says the Haggling lives. Only the server decides this. */
export function setLivingOn(eggId: string, surface: LivingSurface): EggRecord | null {
  return updateEgg(eggId, (e) => {
    if (!e.haggling || e.haggling.livingOn === surface) return
    e.haggling.livingOn = surface
    if (surface === 'phone') delete e.haggling.transferCode
    addScrap(
      e.haggling,
      surface === 'phone'
        ? `${e.haggling.name} moved to the phone. Mother keeps the brood record.`
        : `${e.haggling.name} came back to the nest.`,
    )
  })
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

/** Mirror the server's home device for this Haggling (display only). */
export function setHomeDeviceLocal(eggId: string, deviceId: string | null): EggRecord | null {
  return updateEgg(eggId, (e) => {
    if (!e.haggling) return
    if (deviceId) e.haggling.homeDeviceId = deviceId
    else delete e.haggling.homeDeviceId
  })
}

/** Apply the server's Photo Treat result: it is the newest state, so it wins. */
export function applyTreatLocal(
  eggId: string,
  child: {
    hunger: number
    mood: number
    energy: number
    mess: number
    health_xp: number
    life_xp: number
    last_treat_day: string
    last_tick_at: string
  },
  scrap?: ScrapEntry,
): EggRecord | null {
  return updateEgg(eggId, (e) => {
    const h = e.haggling
    if (!h) return
    h.hunger = child.hunger
    h.mood = child.mood
    h.energy = child.energy
    h.mess = child.mess
    h.healthXp = child.health_xp
    h.sick = child.health_xp < 0
    h.lifeXp = Math.max(h.lifeXp ?? 0, child.life_xp)
    h.lastTreatDay = child.last_treat_day
    h.lastTickAt = child.last_tick_at
    h.lastCleanAt = child.last_tick_at
    h.messHighAt = undefined
    if (scrap && !h.scrapbook.some((x) => x.id === scrap.id)) {
      h.scrapbook.unshift(scrap)
      if (h.scrapbook.length > 40) h.scrapbook.length = 40
    }
  })
}

/** Replace the Haggling with an engine result (weather-mood). */
export function replaceHaggling(eggId: string, next: Haggling): EggRecord | null {
  return updateEgg(eggId, (e) => {
    if (e.haggling) e.haggling = next
  })
}
