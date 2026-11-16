/**
 * Care engine types. Pure data, no browser or Supabase APIs.
 * Spec: .kiro/specs/sync-conflict (R1).
 */

export type ScrapEntry = {
  id: string
  at: string
  text: string
}

export type CareAction = 'feed' | 'cuddle' | 'walk' | 'treat' | 'clean'

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
  /** Weather slot ids already applied (weather-mood). Merged as a set union. */
  weatherApplied?: string[]
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
