/**
 * Care engine types. Pure data, no browser or Supabase APIs.
 * Spec: .kiro/specs/sync-conflict (R1).
 */

export type ScrapEntry = {
  id: string
  at: string
  text: string
  /** ai-haggling R1.3: care, diary, photo, riddle, weather, milestone. Missing = care. */
  kind?: string
}

export type CareAction = 'feed' | 'cuddle' | 'walk' | 'treat' | 'clean' | 'sleep' | 'play' | 'scold' | 'riddle'

/** Where the living care surface is right now. Mother keeps the brood record either way. */
export type LivingSurface = 'mother' | 'phone'

export type MemoryFilm = {
  id: string
  title: string
  src: string
}

export type AlertFlags = {
  hungerZeroNotified: boolean
  moodZeroNotified: boolean
  messWarnNotified: boolean
  hungerPenaltyDone: boolean
  moodPenaltyDone: boolean
  messPenaltyDone: boolean
}

export type Haggling = {
  eggId: string
  name: string
  /** Supabase children.id when cloud-synced */
  cloudChildId?: string
  /** 0-23 local hour for breakfast window */
  breakfastHour: number
  /** 0-23 local hour for dinner window */
  dinnerHour: number
  bedHour: number
  hunger: number
  mood: number
  energy: number
  mess: number
  /** Can go negative: sick (red). */
  healthXp: number
  sick?: boolean
  hungerZeroAt?: string
  moodZeroAt?: string
  messHighAt?: string
  lastCleanAt?: string
  alertFlags?: AlertFlags
  /** The merge timestamp: set by whichever surface last advanced the meters. */
  lastTickAt: string
  lastFeedAt?: string
  lastBedAt?: string
  scrapbook: ScrapEntry[]
  memoryFilms?: MemoryFilm[]
  livingOn: LivingSurface
  transferCode?: string
  sentToPhoneAt?: string
  /** Overall experience (D&D style). Grows with age, care and treats. Never decreases. */
  lifeXp?: number
  /** Local date (YYYY-MM-DD) and count for the daily cap on care XP. */
  careXpDay?: string
  careXpToday?: number
  /** Local date of the last Photo Treat (one per day). */
  lastTreatDay?: string
  /** Chosen at hatch (owner, 20 Nov). */
  sex?: 'male' | 'female'
  /** Mischief hour already scolded (owner, 22 Nov): '<hour index>'. */
  scoldedHour?: number
  /** Haggis Run mini-game: wins this round (set by the app before applyCare('play')). */
  playScore?: number
  /** Folklore riddle (ai-haggling R5.5): the server's verdict, set by the app before applyCare('riddle'). */
  riddleCorrect?: boolean
  /** Local date of the last riddle guess (one a day). */
  lastRiddleDay?: string
  /** Put to bed (owner, 19 Nov): asleep until this time (8 hours). */
  asleepUntil?: string
  /** lifespan-graveyard: server-decided life (born_at, span_ends_at, departed_at). */
  bornAt?: string
  spanEndsAt?: string
  departedAt?: string
  ghostOptIn?: boolean | null
  tone?: string
  epitaph?: string
  /** When it was named/hatched (children.created_at). Drives growth films. */
  hatchedAt?: string
  /** share-card: public id for /h/<id>, and whether the card is on. */
  publicId?: string
  shareEnabled?: boolean
  /** Device id of the home device (phone-home). Server decides; display only. */
  homeDeviceId?: string
  /** Weather slot ids already applied (weather-mood). Merged as a set union. */
  weatherApplied?: string[]
  /** Latest weather shown in the chip (weather-mood R6). */
  weatherBucket?: string
  weatherSlot?: string
  weatherLine?: string
  weatherTempC?: number
  weatherPlace?: string
  /** Legacy single feed hour, migrated on tick. */
  feedHour?: number
}

/** A message the surface may show as a browser notification. The engine never shows it. */
export type Notice = {
  title: string
  body: string
  tag: string
}

export type EngineResult = {
  haggling: Haggling
  notices: Notice[]
}
