import {
  addScrap,
  applyHealthRules,
  ensureHealth,
  penaliseMissedSchedule,
  sootheHealth,
} from './health.ts'
import { RULES } from './rules.ts'
import type { CareAction, EngineResult, Haggling, Notice } from './types.ts'

export type EngineContext = {
  /** Temperament id from the egg's chaos band, e.g. 'douce'. */
  temperamentId: string
  nowMs: number
}

export function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** Local calendar date for a moment, e.g. "2026-11-17". */
export function dayKey(nowMs: number): string {
  const d = new Date(nowMs)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export type LifeLevel = { level: number; xp: number; levelStart: number; nextAt: number }

/** D&D-style level from Life XP. */
export function lifeLevel(xp: number): LifeLevel {
  const t = RULES.levelThresholds
  const value = Math.max(0, Math.floor(xp))
  let level = 1
  let start = 0
  let next = t[1]
  for (let i = 1; ; i++) {
    const at = i < t.length ? t[i] : t[t.length - 1] + (i - t.length + 1) * RULES.levelStepAfter
    if (value < at) {
      next = at
      break
    }
    level = i + 1
    start = at
  }
  return { level, xp: value, levelStart: start, nextAt: next }
}

export function nearHour(hour: number, target: number) {
  return Math.abs(hour - target) <= 1 || Math.abs(hour - target) >= 23
}

/** Migrate old single-feed saves to breakfast + dinner, and fill health defaults. */
export function ensureMeals(h: Haggling) {
  if (typeof h.breakfastHour !== 'number') {
    h.breakfastHour = typeof h.feedHour === 'number' ? h.feedHour : 8
  }
  if (typeof h.dinnerHour !== 'number') h.dinnerHour = 18
  if (!h.livingOn) h.livingOn = 'mother'
  ensureHealth(h)
}

function tickInPlace(h: Haggling, notices: Notice[], ctx: EngineContext) {
  ensureMeals(h)
  const last = new Date(h.lastTickAt).getTime()
  const hours = Math.max(0, (ctx.nowMs - last) / (1000 * 60 * 60))
  if (hours < RULES.minTickHours) return

  const wild = RULES.wildTemperaments.includes(ctx.temperamentId) ? RULES.wildFactor : 1
  const calm = ctx.temperamentId === RULES.calmTemperament ? RULES.calmFactor : 1
  const d = RULES.decayPerHour

  // Sleep: split the gap into asleep and awake hours.
  const sleepEnd = h.asleepUntil ? Date.parse(h.asleepUntil) : Number.NaN
  const asleepH = Number.isFinite(sleepEnd) ? Math.min(hours, Math.max(0, (sleepEnd - last) / 3_600_000)) : 0
  const awakeH = hours - asleepH
  const wasAsleep = asleepH > 0

  h.hunger = clamp(h.hunger - awakeH * d.hunger * wild - asleepH * d.hunger * wild * RULES.sleepHungerFactor)
  h.energy = clamp(h.energy - awakeH * d.energy * calm + asleepH * RULES.sleepEnergyPerHour)
  h.mess = clamp(h.mess + hours * d.mess * wild)
  h.mood = clamp(h.mood - awakeH * d.mood)

  // Natural wake-up after the full sleep: bright-eyed.
  if (Number.isFinite(sleepEnd) && ctx.nowMs >= sleepEnd) {
    h.asleepUntil = undefined
    h.mood = clamp(h.mood + RULES.restedMoodBonus)
    addScrap(h, `${h.name} woke up bright-eyed after a long sleep. Ready for porridge.`, new Date(sleepEnd).toISOString())
  }

  // Life XP grows with age, never down.
  h.lifeXp = (h.lifeXp ?? 0) + (hours * RULES.lifeXpPerDayAlive) / 24

  // Missed breakfast / dinner / bed windows since the last tick.
  const startHour = new Date(last).getHours()
  const endHour = new Date(ctx.nowMs).getHours()
  const crossed = (target: number) => {
    if (hours >= 24) return true
    if (startHour === endHour && hours < 1) return false
    if (startHour < endHour) return target > startHour && target <= endHour
    return target > startHour || target <= endHour
  }

  if (crossed(h.breakfastHour) && h.hunger < RULES.missedMealHungerBelow) {
    h.mood = clamp(h.mood - RULES.missedMealMoodHit)
    penaliseMissedSchedule(h, notices, 'breakfast')
  }
  if (crossed(h.dinnerHour) && h.hunger < RULES.missedMealHungerBelow) {
    h.mood = clamp(h.mood - RULES.missedMealMoodHit)
    penaliseMissedSchedule(h, notices, 'dinner')
  }
  if (!wasAsleep && crossed(h.bedHour) && h.energy < RULES.missedBedEnergyBelow) {
    h.mood = clamp(h.mood - RULES.missedBedMoodHit)
    penaliseMissedSchedule(h, notices, 'bedtime')
  }

  if (h.hunger < RULES.lowHungerBelow) h.mood = clamp(h.mood - RULES.lowHungerMoodHit)
  if (h.mess > RULES.highMessAbove) h.mood = clamp(h.mood - RULES.highMessMoodHit)

  applyHealthRules(h, notices, ctx.nowMs)
  h.lastTickAt = new Date(ctx.nowMs).toISOString()
}

/** Advance vitals from lastTickAt to now. Pure: returns a new Haggling. */
export function tick(input: Haggling, ctx: EngineContext): EngineResult {
  const haggling = structuredClone(input)
  const notices: Notice[] = []
  tickInPlace(haggling, notices, ctx)
  return { haggling, notices }
}

/** Tick forward, then apply one care action. Pure: returns a new Haggling. */
export function applyCare(
  input: Haggling,
  action: CareAction,
  ctx: EngineContext,
): EngineResult {
  const h = structuredClone(input)
  const notices: Notice[] = []
  tickInPlace(h, notices, ctx)

  const now = new Date(ctx.nowMs)
  const hour = now.getHours()
  const nearBreakfast = nearHour(hour, h.breakfastHour)
  const nearDinner = nearHour(hour, h.dinnerHour)
  const nearFeed = nearBreakfast || nearDinner
  const nearBed = nearHour(hour, h.bedHour)
  const mealLabel = nearBreakfast ? 'breakfast' : nearDinner ? 'dinner' : null

  // Woken early (fed, walked or given a treat while asleep): grumpy.
  const asleep = h.asleepUntil ? ctx.nowMs < Date.parse(h.asleepUntil) : false
  if (asleep && RULES.wakesGrumpy.includes(action)) {
    h.asleepUntil = undefined
    h.mood = clamp(h.mood - RULES.grumpyMoodHit)
    addScrap(h, `${h.name} was woken up early and is in a right crabbit mood.`)
  }

  switch (action) {
    case 'sleep':
      if (asleep) break // already asleep
      h.asleepUntil = new Date(ctx.nowMs + RULES.sleepHours * 3_600_000).toISOString()
      h.lastBedAt = now.toISOString()
      addScrap(h, `${h.name} was tucked in for the night. Wheesht now.`)
      break
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

  // Life XP for care, capped per day so button-mashing does not level up.
  const today = dayKey(ctx.nowMs)
  if (h.careXpDay !== today) {
    h.careXpDay = today
    h.careXpToday = 0
  }
  if ((h.careXpToday ?? 0) < RULES.lifeXpCareCapPerDay) {
    h.careXpToday = (h.careXpToday ?? 0) + 1
    h.lifeXp = (h.lifeXp ?? 0) + RULES.lifeXpPerCare
  }

  if (nearBed && action === 'cuddle') {
    h.energy = clamp(h.energy + 12)
    h.lastBedAt = now.toISOString()
    sootheHealth(h, 3)
    addScrap(h, `Bedtime cuddle. ${h.name} settled.`)
  }

  applyHealthRules(h, notices, ctx.nowMs)
  h.lastTickAt = now.toISOString()
  return { haggling: h, notices }
}

export type TreatResult =
  | { accepted: true; haggling: Haggling; notices: Notice[] }
  | { accepted: false; reason: 'already-today'; haggling: Haggling; notices: Notice[] }

/**
 * Photo Treat (photo-care R2): full refill, Mess cleared, big XP boost, once a day.
 * Pure. The server calls this; the phone only shows the result.
 */
export function applyPhotoTreat(
  input: Haggling,
  treatName: string,
  ctx: EngineContext,
): TreatResult {
  const h = structuredClone(input)
  const notices: Notice[] = []
  tickInPlace(h, notices, ctx)
  const today = dayKey(ctx.nowMs)
  if (h.lastTreatDay === today) {
    return { accepted: false, reason: 'already-today', haggling: h, notices }
  }
  h.hunger = 100
  h.mood = 100
  h.energy = 100
  h.mess = 0
  h.messHighAt = undefined
  h.lastCleanAt = new Date(ctx.nowMs).toISOString()
  sootheHealth(h, RULES.healthXpPhotoTreat)
  h.lifeXp = (h.lifeXp ?? 0) + RULES.lifeXpPhotoTreat
  h.lastTreatDay = today
  addScrap(h, `Photo Treat: ${treatName}! ${h.name} is fit to burst, every bar full.`)
  applyHealthRules(h, notices, ctx.nowMs)
  h.lastTickAt = new Date(ctx.nowMs).toISOString()
  return { accepted: true, haggling: h, notices }
}
