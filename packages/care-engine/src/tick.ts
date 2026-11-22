import {
  addScrap,
  applyHealthRules,
  ensureHealth,
  penaliseMissedSchedule,
  sootheHealth,
} from './health.ts'
import type { StageId } from './life.ts'
import { RULES } from './rules.ts'
import { stageLine, stageRule } from './stages.ts'
import type { CareAction, EngineResult, Haggling, Notice } from './types.ts'

export type EngineContext = {
  /** Temperament id from the egg's chaos band, e.g. 'douce'. */
  temperamentId: string
  nowMs: number
  /** Life stage (docs/LIFE-STAGES.md). Missing = baby (the original rules). */
  stage?: StageId
  /** Carer's IANA time zone (PBT finding F2). Missing = the clock of the device running the engine. */
  timezone?: string
}

export function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** 0-100 without rounding: time passing keeps exact fractions (PBT finding F1). */
function clampExact(n: number) {
  return Math.max(0, Math.min(100, n))
}

/** Bars as whole numbers, for showing and saving (database columns are integers). */
export function wholeBars(h: Pick<Haggling, 'hunger' | 'mood' | 'energy' | 'mess'>) {
  return { hunger: clamp(h.hunger), mood: clamp(h.mood), energy: clamp(h.energy), mess: clamp(h.mess) }
}

/** Local hour and date in a time zone (or this device's clock when none is given). */
export function localTime(nowMs: number, timezone?: string): { hour: number; date: string } {
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
      }).formatToParts(new Date(nowMs))
      const get = (t: string) => parts.find((x) => x.type === t)?.value ?? '00'
      return { hour: Number(get('hour')) % 24, date: `${get('year')}-${get('month')}-${get('day')}` }
    } catch {
      // Unknown zone name: fall through to the device clock.
    }
  }
  const d = new Date(nowMs)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return { hour: d.getHours(), date: `${d.getFullYear()}-${mm}-${dd}` }
}

/** Local calendar date for a moment, e.g. "2026-11-17". */
export function dayKey(nowMs: number, timezone?: string): string {
  return localTime(nowMs, timezone).date
}

/** When (ms) the local clock first reaches `targetHour`:00 after `fromMs`, if not after `toMs`. 15-minute steps. */
function firstLocalHour(fromMs: number, toMs: number, targetHour: number, timezone?: string): number | null {
  const step = 15 * 60_000
  let prev = localTime(fromMs, timezone).hour
  for (let t = Math.floor(fromMs / step) * step + step; t <= toMs; t += step) {
    const hr = localTime(t, timezone).hour
    if (hr !== prev && hr === targetHour) return t
    prev = hr
  }
  return null
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

/** Mischief (owner, 22 Nov): is the Haggling misbehaving this hour? Pure + same on every device. */
export function isMisbehaving(h: Haggling, temperamentId: string, nowMs: number): boolean {
  if (h.asleepUntil && nowMs < Date.parse(h.asleepUntil)) return false
  const hourIndex = Math.floor(nowMs / 3_600_000)
  if (h.scoldedHour === hourIndex) return false
  let x = 2166136261
  for (const ch of `${h.eggId}:${hourIndex}`) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0
  return x % 100 < (RULES.mischiefPerHour[temperamentId] ?? 15)
}

const MISCHIEF = [
  '{name} is drawing on the walls with a neep.',
  '{name} has hidden your car keys in the porridge.',
  '{name} is howling at the telly for no reason.',
  '{name} is unrolling the toilet roll, very slowly, maintaining eye contact.',
]

export function mischiefLine(h: Haggling, nowMs: number): string {
  return MISCHIEF[Math.floor(nowMs / 3_600_000) % MISCHIEF.length].replace(/\{name\}/g, () => h.name)
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
  const last = Date.parse(h.lastTickAt)
  // PBT finding F5: an unreadable save time would turn every bar into NaN. Treat it as "now".
  if (!Number.isFinite(last)) {
    h.lastTickAt = new Date(ctx.nowMs).toISOString()
    return
  }
  const hours = Math.max(0, (ctx.nowMs - last) / (1000 * 60 * 60))
  if (hours < RULES.minTickHours) return
  const wild = RULES.wildTemperaments.includes(ctx.temperamentId) ? RULES.wildFactor : 1
  const calm = ctx.temperamentId === RULES.calmTemperament ? RULES.calmFactor : 1
  const d = RULES.decayPerHour
  const sr = stageRule(ctx.stage)
  // Sleep: split the gap into asleep and awake hours.
  const sleepEnd = h.asleepUntil ? Date.parse(h.asleepUntil) : Number.NaN
  const asleepH = Number.isFinite(sleepEnd) ? Math.min(hours, Math.max(0, (sleepEnd - last) / 3_600_000)) : 0
  const awakeH = hours - asleepH
  const wasAsleep = asleepH > 0
  // PBT finding F1: exact fractions (no rounding) so a 30-second check loses nothing.
  const start = { hunger: h.hunger, energy: h.energy, mess: h.mess }
  h.hunger = clampExact(h.hunger - (awakeH + asleepH * RULES.sleepHungerFactor) * d.hunger * wild * sr.decay)
  h.energy = clampExact(h.energy - awakeH * d.energy * calm * sr.decay + asleepH * RULES.sleepEnergyPerHour)
  h.mess = clampExact(h.mess + hours * d.mess * wild * sr.messGrowth)
  h.mood = clampExact(h.mood - awakeH * d.mood * sr.decay)
  /** A bar's value part-way through the gap (straight line from start to end). */
  const at = (key: 'hunger' | 'energy', ms: number) =>
    start[key] + (h[key] - start[key]) * ((ms - last) / Math.max(1, ctx.nowMs - last))
  // Natural wake-up after the full sleep: bright-eyed.
  if (Number.isFinite(sleepEnd) && ctx.nowMs >= sleepEnd) {
    h.asleepUntil = undefined
    h.mood = clampExact(h.mood + RULES.restedMoodBonus)
    addScrap(h, `${h.name} woke up bright-eyed after a long sleep. Ready for porridge.`, new Date(sleepEnd).toISOString())
  }
  // Life XP grows with age, never down.
  h.lifeXp = (h.lifeXp ?? 0) + (hours * RULES.lifeXpPerDayAlive) / 24
  // Missed breakfast / dinner / bed since the last tick, judged at the moment the carer's
  // clock reached that hour (PBT findings F1, F2), not at the end of the gap.
  const missedAt = (target: number): number | null =>
    hours >= 24 ? ctx.nowMs : firstLocalHour(last, ctx.nowMs, target, ctx.timezone)
  const breakfastAt = missedAt(h.breakfastHour)
  if (breakfastAt !== null && at('hunger', breakfastAt) < RULES.missedMealHungerBelow) {
    h.mood = clampExact(h.mood - RULES.missedMealMoodHit)
    penaliseMissedSchedule(h, notices, 'breakfast')
  }
  const dinnerAt = missedAt(h.dinnerHour)
  if (dinnerAt !== null && at('hunger', dinnerAt) < RULES.missedMealHungerBelow) {
    h.mood = clampExact(h.mood - RULES.missedMealMoodHit)
    penaliseMissedSchedule(h, notices, 'dinner')
  }
  const bedAt = missedAt(h.bedHour)
  if (!wasAsleep && bedAt !== null && at('energy', bedAt) < RULES.missedBedEnergyBelow) {
    h.mood = clampExact(h.mood - RULES.missedBedMoodHit)
    penaliseMissedSchedule(h, notices, 'bedtime')
  }
  // Hungry and messy cost Mood per awake hour spent that way (was per check: PBT finding F1).
  const hoursWhere = (a: number, b: number, isBad: (v: number) => boolean, line: number) => {
    if (isBad(a) && isBad(b)) return awakeH
    if (!isBad(a) && !isBad(b)) return 0
    const f = (line - a) / (b - a) // where the straight line crosses the threshold
    return awakeH * (isBad(b) ? 1 - f : f)
  }
  h.mood = clampExact(h.mood - hoursWhere(start.hunger, h.hunger, (v) => v < RULES.lowHungerBelow, RULES.lowHungerBelow) * RULES.lowHungerMoodHit)
  h.mood = clampExact(h.mood - hoursWhere(start.mess, h.mess, (v) => v > RULES.highMessAbove, RULES.highMessAbove) * RULES.highMessMoodHit)
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
  const hour = localTime(ctx.nowMs, ctx.timezone).hour
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

  const moodBefore = h.mood
  const energyBefore = h.energy
  const scrapsBefore = h.scrapbook.length
  const sr = stageRule(ctx.stage)

  switch (action) {
    case 'sleep':
      if (asleep) break // already asleep
      h.asleepUntil = new Date(ctx.nowMs + sr.sleepHours * 3_600_000).toISOString()
      h.lastBedAt = now.toISOString()
      addScrap(h, `${h.name} was tucked in for the night. Wheesht now.`)
      break
    case 'scold': {
      // Discipline (owner, 22 Nov): fair when they are misbehaving, unfair otherwise.
      const fair = isMisbehaving(input, ctx.temperamentId, ctx.nowMs)
      if (fair) {
        h.mood = clamp(h.mood - RULES.scoldMoodHit)
        h.scoldedHour = Math.floor(ctx.nowMs / 3_600_000)
        addScrap(h, `You told ${h.name} off. A sulk, then they stopped. Lesson learned.`)
      } else {
        h.mood = clamp(h.mood - RULES.unfairScoldMoodHit)
        h.healthXp -= RULES.unfairScoldHealthHit
        if (h.healthXp < 0) h.sick = true
        addScrap(h, `You told ${h.name} off for nothing. Big wobbly lip. That stung.`)
      }
      break
    }
    case 'play': {
      const wins = Math.max(0, Math.min(5, Math.round(h.playScore ?? 0)))
      h.playScore = undefined
      h.mood = clamp(h.mood + wins * RULES.playMoodPerWin)
      h.energy = clamp(h.energy - RULES.playEnergyCost)
      addScrap(h, wins >= 4
        ? `Haggis Run! You guessed ${wins} of 5 and ${h.name} is chuffed to bits.`
        : wins >= 2
          ? `Haggis Run: ${wins} of 5. ${h.name} says best of three next time.`
          : `Haggis Run: ${wins} of 5. ${h.name} ran rings round you, literally.`)
      break
    }
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
  const today = dayKey(ctx.nowMs, ctx.timezone)
  if (h.careXpDay !== today) {
    h.careXpDay = today
    h.careXpToday = 0
  }
  if ((h.careXpToday ?? 0) < RULES.lifeXpCareCapPerDay) {
    h.careXpToday = (h.careXpToday ?? 0) + 1
    h.lifeXp = (h.lifeXp ?? 0) + RULES.lifeXpPerCare
  }

  // Life stage (docs/LIFE-STAGES.md): scale the mood/energy effect, teen cuddles, stage lines.
  const tweak = sr.care[action]
  if (action === 'cuddle' && sr.rejectsCuddles) {
    h.mood = clamp(moodBefore - 3)
  } else if (tweak?.mood) {
    h.mood = clamp(moodBefore + (h.mood - moodBefore) * tweak.mood)
  }
  if (tweak?.energyCost && h.energy < energyBefore) {
    h.energy = clamp(energyBefore - (energyBefore - h.energy) * tweak.energyCost)
  }
  const line = stageLine(ctx.stage, action, h.name, ctx.nowMs)
  if (line && h.scrapbook.length > scrapsBefore) h.scrapbook[0] = { ...h.scrapbook[0], text: line }

  if (nearBed && action === 'cuddle' && !sr.rejectsCuddles) {
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
  const today = dayKey(ctx.nowMs, ctx.timezone)
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
