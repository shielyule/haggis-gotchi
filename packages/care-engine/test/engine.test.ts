// Spec: .kiro/specs/sync-conflict T2 (one engine, numbers ported unchanged)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { careAlertFor, healthLabel } from '../src/health.ts'
import { applyCare, tick, wholeBars } from '../src/tick.ts'
import type { Haggling } from '../src/types.ts'

// Midday local time so no meal or bed window is crossed in the first hours.
const T0 = new Date()
T0.setHours(10, 30, 0, 0)
const START = T0.getTime()
const hoursLater = (h: number) => START + h * 3_600_000

function fresh(): Haggling {
  return {
    eggId: 'e', name: 'Wee Yin', breakfastHour: 8, dinnerHour: 18, bedHour: 23,
    hunger: 72, mood: 78, energy: 70, mess: 12, healthXp: 50,
    lastTickAt: new Date(START).toISOString(), scrapbook: [], livingOn: 'mother',
  }
}

test('tick is pure: input is not mutated', () => {
  const h = fresh()
  const before = JSON.stringify(h)
  tick(h, { temperamentId: 'douce', nowMs: hoursLater(1) })
  assert.equal(JSON.stringify(h), before)
})

test('decay numbers match the original rules (1 hour, ordinary temperament)', () => {
  const r = tick(fresh(), { temperamentId: 'ill-trickit', nowMs: hoursLater(1) }).haggling
  assert.equal(r.hunger, 63) // 72 - 9
  assert.equal(r.energy, 64) // 70 - 6
  assert.equal(r.mess, 17) // 12 + 5
  assert.equal(r.mood, 74) // 78 - 4
})

test('wild temperaments decay faster, douce loses energy slower', () => {
  const wild = tick(fresh(), { temperamentId: 'fair-wud', nowMs: hoursLater(1) }).haggling
  const calm = tick(fresh(), { temperamentId: 'douce', nowMs: hoursLater(1) }).haggling
  // Exact fractions inside the engine since 22 Nov (PBT finding F1); shown rounded.
  assert.ok(Math.abs(wild.hunger - 61.65) < 1e-9) // 72 - 9*1.15
  assert.ok(Math.abs(calm.energy - 64.9) < 1e-9) // 70 - 6*0.85
  assert.equal(wholeBars(wild).hunger, 62)
  assert.equal(wholeBars(calm).energy, 65)
})

test('under 0.02 hours does nothing', () => {
  const h = fresh()
  const r = tick(h, { temperamentId: 'douce', nowMs: START + 30_000 }).haggling
  assert.equal(r.hunger, h.hunger)
  assert.equal(r.lastTickAt, h.lastTickAt)
})

test('feed raises hunger and mood, adds a scrapbook line, soothes health', () => {
  const r = applyCare(fresh(), 'feed', { temperamentId: 'douce', nowMs: START }).haggling
  assert.equal(r.hunger, 100)
  assert.ok(r.mood > 78)
  assert.equal(r.scrapbook.length, 1)
  assert.match(r.scrapbook[0].text, /Fed Wee Yin/)
  assert.ok(r.healthXp > 50)
})

test('starving for 12 hours costs health XP once and returns a notice, not a side effect', () => {
  const h = { ...fresh(), hunger: 0 }
  const a = tick(h, { temperamentId: 'douce', nowMs: hoursLater(1) })
  assert.ok(a.notices.some((n) => n.tag === 'hunger-zero'))
  const b = tick(a.haggling, { temperamentId: 'douce', nowMs: hoursLater(14) })
  assert.ok(b.haggling.healthXp < a.haggling.healthXp)
  const c = tick(b.haggling, { temperamentId: 'douce', nowMs: hoursLater(15) })
  assert.ok(c.haggling.healthXp >= b.haggling.healthXp - 7, 'penalty is not applied twice')
})

test('labels and alert levels', () => {
  assert.equal(healthLabel({ ...fresh(), healthXp: 80 }), 'Bonnie')
  assert.equal(healthLabel({ ...fresh(), healthXp: -1 }), 'Sick')
  assert.equal(careAlertFor({ ...fresh(), healthXp: -1 }), 'red')
  assert.equal(careAlertFor({ ...fresh(), mess: 60 }), 'amber')
  assert.equal(careAlertFor(fresh()), 'ok')
})
