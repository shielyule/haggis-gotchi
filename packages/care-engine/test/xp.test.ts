// Spec: .kiro/specs/photo-care T1 (R2, R5)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeHaggling } from '../src/merge.ts'
import { applyCare, applyPhotoTreat, dayKey, lifeLevel, tick } from '../src/tick.ts'
import type { Haggling } from '../src/types.ts'

const T0 = new Date()
T0.setHours(10, 30, 0, 0)
const START = T0.getTime()
const at = (h: number) => START + h * 3_600_000
const ctx = (h: number) => ({ temperamentId: 'ree', nowMs: at(h) })

function fresh(): Haggling {
  return {
    eggId: 'e', name: 'Wee Yin', breakfastHour: 8, dinnerHour: 18, bedHour: 23,
    hunger: 30, mood: 40, energy: 20, mess: 70, healthXp: 50,
    lastTickAt: new Date(START).toISOString(), scrapbook: [], livingOn: 'phone',
  }
}

test('levels follow D&D-style thresholds', () => {
  assert.deepEqual([0, 99, 100, 299, 300, 600, 999, 1000, 1499, 1500, 2000].map((x) => lifeLevel(x).level),
    [1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 7])
  assert.equal(lifeLevel(150).nextAt, 300)
  assert.equal(lifeLevel(150).levelStart, 100)
})

test('Life XP grows with age: 10 per day alive', () => {
  const r = tick(fresh(), ctx(24)).haggling
  assert.ok(Math.abs((r.lifeXp ?? 0) - 10) < 1e-9)
})

test('care adds 1 Life XP, capped at 30 a day', () => {
  let h = fresh()
  for (let i = 0; i < 40; i++) h = applyCare(h, 'cuddle', { temperamentId: 'ree', nowMs: START + i }).haggling
  assert.equal(h.careXpToday, 30)
  assert.ok(Math.abs((h.lifeXp ?? 0) - 30) < 0.01)
})

test('Photo Treat fills Hunger/Mood/Energy, clears Mess, boosts both XPs', () => {
  const r = applyPhotoTreat(fresh(), 'Irn-Bru', ctx(0))
  assert.equal(r.accepted, true)
  const h = r.haggling
  assert.deepEqual([h.hunger, h.mood, h.energy, h.mess], [100, 100, 100, 0])
  assert.equal(h.healthXp, 70)
  assert.equal(h.lifeXp, 50)
  assert.equal(h.lastTreatDay, dayKey(at(0)))
  assert.match(h.scrapbook[0].text, /Irn-Bru/)
})

test('Photo Treat: once a day, refusal changes nothing', () => {
  const first = applyPhotoTreat(fresh(), 'Irn-Bru', ctx(0)).haggling
  const second = applyPhotoTreat(first, 'Shortbread', { temperamentId: 'ree', nowMs: at(0) + 60_000 })
  assert.equal(second.accepted, false)
  assert.equal(second.haggling.lifeXp, first.lifeXp)
  assert.equal(second.haggling.scrapbook.length, first.scrapbook.length)
})

test('Health XP from a treat is capped at 100', () => {
  const r = applyPhotoTreat({ ...fresh(), healthXp: 95 }, 'Kilt', ctx(0)).haggling
  assert.equal(r.healthXp, 100)
})

test('merge never lowers Life XP, keeps the latest treat day', () => {
  const a = { ...fresh(), lifeXp: 120, lastTreatDay: '2026-11-17', lastTickAt: new Date(at(1)).toISOString() }
  const b = { ...fresh(), lifeXp: 80, lastTreatDay: '2026-11-16', lastTickAt: new Date(at(2)).toISOString() }
  const m = mergeHaggling(a, b)
  assert.equal(m.lifeXp, 120)
  assert.equal(m.lastTreatDay, '2026-11-17')
})
