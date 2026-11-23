import { RULES } from './rules.ts'
import type { Haggling, Notice, ScrapEntry } from './types.ts'

export type CareAlert = 'ok' | 'amber' | 'red'

export function newId(): string {
  return globalThis.crypto.randomUUID()
}

/** Append a scrapbook line (newest first), capped. Mutates the draft. */
export function addScrap(h: Haggling, text: string, atIso?: string, kind?: string) {
  const entry: ScrapEntry = {
    id: newId(),
    at: atIso ?? new Date().toISOString(),
    text,
    ...(kind ? { kind } : {}),
  }
  h.scrapbook.unshift(entry)
  if (h.scrapbook.length > RULES.scrapbookMax) h.scrapbook.length = RULES.scrapbookMax
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
  const c = structuredClone(h)
  ensureHealth(c)
  if (c.healthXp < 0 || c.sick) return 'red'
  if (
    c.hunger <= 0 ||
    c.mood <= 0 ||
    c.mess >= RULES.messDirty ||
    c.healthXp <= RULES.amberAtOrBelow
  ) {
    return 'amber'
  }
  return 'ok'
}

export function healthLabel(h: Haggling): string {
  const xp = typeof h.healthXp === 'number' ? h.healthXp : 50
  if (h.sick || xp < 0) return 'Sick'
  if (xp < RULES.frailBelow) return 'Frail'
  if (xp < RULES.peakyBelow) return 'Peaky'
  if (xp < RULES.fairBelow) return 'Fair'
  return 'Bonnie'
}

type FlagKey =
  | 'hungerPenaltyDone'
  | 'moodPenaltyDone'
  | 'messPenaltyDone'

function applyPenalty(
  h: Haggling,
  notices: Notice[],
  reason: string,
  scrap: string,
  title: string,
  flagKey: FlagKey,
) {
  ensureHealth(h)
  if (!h.alertFlags || h.alertFlags[flagKey]) return
  h.alertFlags[flagKey] = true
  h.healthXp -= RULES.penaltyHealth
  if (h.healthXp < 0) h.sick = true
  addScrap(h, scrap)
  notices.push({ title, body: reason, tag: `penalty-${flagKey}` })
}

/** After vitals decay / schedule misses: zeros, timers, penalties, alerts. Mutates the draft. */
export function applyHealthRules(h: Haggling, notices: Notice[], nowMs: number) {
  ensureHealth(h)
  const flags = h.alertFlags!

  if (h.hunger <= 0) {
    if (!h.hungerZeroAt) h.hungerZeroAt = new Date(nowMs).toISOString()
    if (!flags.hungerZeroNotified) {
      flags.hungerZeroNotified = true
      addScrap(h, `${h.name}'s hunger hit empty. The room feels amber.`)
      notices.push({
        title: `${h.name} is starving`,
        body: 'Hunger is at zero. Feed them before a health penalty lands.',
        tag: 'hunger-zero',
      })
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
      notices.push({
        title: `${h.name} is desolate`,
        body: 'Mood is at zero. A long sulk will cost health XP.',
        tag: 'mood-zero',
      })
    }
  } else {
    h.moodZeroAt = undefined
    flags.moodZeroNotified = false
    flags.moodPenaltyDone = false
  }

  if (h.mess >= RULES.messDirty) {
    if (!h.messHighAt) h.messHighAt = new Date(nowMs).toISOString()
    if (!flags.messWarnNotified) {
      flags.messWarnNotified = true
      addScrap(h, `The mess is getting ripe around ${h.name}.`)
      notices.push({
        title: `${h.name} needs a clean`,
        body: 'Mess is high. Clear it within 12 hours or health takes a hit.',
        tag: 'mess-warn',
      })
    }
  } else {
    h.messHighAt = undefined
    flags.messWarnNotified = false
    flags.messPenaltyDone = false
  }

  if (h.hungerZeroAt && hoursSince(h.hungerZeroAt, nowMs) >= RULES.hungerZeroPenaltyHours) {
    applyPenalty(
      h,
      notices,
      'Hunger stayed at zero for 12 hours.',
      `Penalty: ${h.name} went without food too long. Health XP dropped. They feel sick.`,
      `${h.name} - hunger penalty`,
      'hungerPenaltyDone',
    )
  }

  if (h.moodZeroAt && hoursSince(h.moodZeroAt, nowMs) >= RULES.moodZeroPenaltyHours) {
    applyPenalty(
      h,
      notices,
      'Mood stayed at zero for 24 hours.',
      `Penalty: ${h.name} sulked a full day. Health XP dropped. Feverish wee soul.`,
      `${h.name} - mood penalty`,
      'moodPenaltyDone',
    )
  }

  const messClock = h.messHighAt ?? h.lastCleanAt
  if (
    h.mess >= RULES.messDirty &&
    messClock &&
    hoursSince(messClock, nowMs) >= RULES.messPenaltyHours
  ) {
    applyPenalty(
      h,
      notices,
      'Mess left uncleared for 12 hours.',
      `Penalty: the mess sat 12 hours. ${h.name}'s health XP took a hit.`,
      `${h.name} - mess penalty`,
      'messPenaltyDone',
    )
  }

  h.sick = h.healthXp < 0
}

/** Missed breakfast/dinner/bed by more than the window: health ding + notice. */
export function penaliseMissedSchedule(
  h: Haggling,
  notices: Notice[],
  kind: 'breakfast' | 'dinner' | 'bedtime',
) {
  ensureHealth(h)
  h.healthXp -= RULES.missScheduleHealth
  if (h.healthXp < 0) h.sick = true
  addScrap(h, `Missed ${kind} by more than an hour. ${h.name} lost health XP.`)
  notices.push({
    title: `Missed ${kind}`,
    body: `${h.name} needed you at ${kind}. Health XP took a wee knock.`,
    tag: `miss-${kind}`,
  })
}

/** Care that restores health a little. */
export function sootheHealth(h: Haggling, amount: number) {
  ensureHealth(h)
  h.healthXp = Math.min(100, h.healthXp + amount)
  if (h.healthXp >= 0) h.sick = false
}
