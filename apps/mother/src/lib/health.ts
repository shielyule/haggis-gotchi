import { notifyCare } from './notifications'
import type { Haggling } from './storage'

export type CareAlert = 'ok' | 'amber' | 'red'

const MESS_DIRTY = 55
const PENALTY_HEALTH = 12
const MISS_SCHEDULE_HEALTH = 6

function addScrap(h: Haggling, text: string) {
  h.scrapbook.unshift({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    text,
  })
  if (h.scrapbook.length > 40) h.scrapbook.length = 40
}

function hoursSince(iso: string | undefined, nowMs: number): number {
  if (!iso) return 0
  return Math.max(0, (nowMs - new Date(iso).getTime()) / (1000 * 60 * 60))
}

export function ensureHealth(h: Haggling) {
  if (typeof h.healthXp !== 'number') h.healthXp = 50
  if (!h.lastCleanAt) h.lastCleanAt = h.lastTickAt
  if (!h.alertFlags) {
    h.alertFlags = {
      hungerZeroNotified: false,
      moodZeroNotified: false,
      messWarnNotified: false,
      hungerPenaltyDone: false,
      moodPenaltyDone: false,
      messPenaltyDone: false,
    }
  }
}

export function careAlertFor(h: Haggling): CareAlert {
  ensureHealth(h)
  if (h.healthXp < 0 || h.sick) return 'red'
  if (
    h.hunger <= 0 ||
    h.mood <= 0 ||
    h.mess >= MESS_DIRTY ||
    h.healthXp <= 15
  ) {
    return 'amber'
  }
  return 'ok'
}

export function healthLabel(h: Haggling): string {
  ensureHealth(h)
  if (h.sick || h.healthXp < 0) return 'Sick'
  if (h.healthXp < 20) return 'Frail'
  if (h.healthXp < 40) return 'Peaky'
  if (h.healthXp < 70) return 'Fair'
  return 'Bonnie'
}

function applyPenalty(
  h: Haggling,
  reason: string,
  scrap: string,
  notifyTitle: string,
  flagKey: keyof NonNullable<Haggling['alertFlags']>,
) {
  ensureHealth(h)
  if (!h.alertFlags || h.alertFlags[flagKey]) return
  h.alertFlags[flagKey] = true
  h.healthXp -= PENALTY_HEALTH
  if (h.healthXp < 0) h.sick = true
  addScrap(h, scrap)
  notifyCare(notifyTitle, reason, `penalty-${flagKey}`)
}

/** After vitals decay / schedule misses — zeros, timers, penalties, alerts. */
export function applyHealthRules(h: Haggling, nowMs = Date.now()) {
  ensureHealth(h)
  const flags = h.alertFlags!

  // Track zeros / dirty
  if (h.hunger <= 0) {
    if (!h.hungerZeroAt) h.hungerZeroAt = new Date(nowMs).toISOString()
    if (!flags.hungerZeroNotified) {
      flags.hungerZeroNotified = true
      addScrap(h, `${h.name}'s hunger hit empty. The room feels amber.`)
      notifyCare(
        `${h.name} is starving`,
        'Hunger is at zero. Feed them before a health penalty lands.',
        'hunger-zero',
      )
    }
  } else {
    h.hungerZeroAt = undefined
    flags.hungerZeroNotified = false
    flags.hungerPenaltyDone = false
  }

  if (h.mood <= 0) {
    if (!h.moodZeroAt) h.moodZeroAt = new Date(nowMs).toISOString()
    if (!flags.moodZeroNotified) {
      flags.moodZeroNotified = true
      addScrap(h, `${h.name}'s mood hit rock bottom. Amber warning.`)
      notifyCare(
        `${h.name} is desolate`,
        'Mood is at zero. A long sulk will cost health XP.',
        'mood-zero',
      )
    }
  } else {
    h.moodZeroAt = undefined
    flags.moodZeroNotified = false
    flags.moodPenaltyDone = false
  }

  if (h.mess >= MESS_DIRTY) {
    if (!h.messHighAt) h.messHighAt = new Date(nowMs).toISOString()
    if (!flags.messWarnNotified) {
      flags.messWarnNotified = true
      addScrap(h, `The mess is getting ripe around ${h.name}.`)
      notifyCare(
        `${h.name} needs a clean`,
        'Mess is high. Clear it within 12 hours or health takes a hit.',
        'mess-warn',
      )
    }
  } else {
    h.messHighAt = undefined
    flags.messWarnNotified = false
    flags.messPenaltyDone = false
  }

  // Penalties
  if (h.hungerZeroAt && hoursSince(h.hungerZeroAt, nowMs) >= 12) {
    applyPenalty(
      h,
      'Hunger stayed at zero for 12 hours.',
      `Penalty: ${h.name} went without food too long. Health XP dropped. They feel sick.`,
      `${h.name} — hunger penalty`,
      'hungerPenaltyDone',
    )
  }

  if (h.moodZeroAt && hoursSince(h.moodZeroAt, nowMs) >= 24) {
    applyPenalty(
      h,
      'Mood stayed at zero for 24 hours.',
      `Penalty: ${h.name} sulked a full day. Health XP dropped. Feverish wee soul.`,
      `${h.name} — mood penalty`,
      'moodPenaltyDone',
    )
  }

  const messClock = h.messHighAt ?? h.lastCleanAt
  if (
    h.mess >= MESS_DIRTY &&
    messClock &&
    hoursSince(messClock, nowMs) >= 12
  ) {
    applyPenalty(
      h,
      'Mess left uncleared for 12 hours.',
      `Penalty: the mess sat 12 hours. ${h.name}'s health XP took a hit.`,
      `${h.name} — mess penalty`,
      'messPenaltyDone',
    )
  }

  h.sick = h.healthXp < 0
}

/** Missed breakfast/dinner/bed by more than the window → health ding + notify. */
export function penaliseMissedSchedule(
  h: Haggling,
  kind: 'breakfast' | 'dinner' | 'bedtime',
) {
  ensureHealth(h)
  h.healthXp -= MISS_SCHEDULE_HEALTH
  if (h.healthXp < 0) h.sick = true
  const label =
    kind === 'breakfast'
      ? 'breakfast'
      : kind === 'dinner'
        ? 'dinner'
        : 'bedtime'
  addScrap(
    h,
    `Missed ${label} by more than an hour. ${h.name} lost health XP.`,
  )
  notifyCare(
    `Missed ${label}`,
    `${h.name} needed you at ${label}. Health XP took a wee knock.`,
    `miss-${kind}`,
  )
}

/** Care that restores health a little. */
export function sootheHealth(h: Haggling, amount: number) {
  ensureHealth(h)
  h.healthXp = Math.min(100, h.healthXp + amount)
  if (h.healthXp >= 0) h.sick = false
}
