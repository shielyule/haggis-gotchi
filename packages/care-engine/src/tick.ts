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

  h.hunger = clamp(h.hunger - hours * d.hunger * wild)
  h.energy = clamp(h.energy - hours * d.energy * calm)
  h.mess = clamp(h.mess + hours * d.mess * wild)
  h.mood = clamp(h.mood - hours * d.mood)

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
  if (crossed(h.bedHour) && h.energy < RULES.missedBedEnergyBelow) {
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

  applyHealthRules(h, notices, ctx.nowMs)
  h.lastTickAt = now.toISOString()
  return { haggling: h, notices }
}
